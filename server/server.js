const express = require('express');
const app = express();
const port = 3001;
const path = require('path');
const fs = require('fs');
const util = require('util');

var bodyParser  = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var server =  app.listen(port, () => console.log(`Listening on port ${port}`));
var log_stdout = process.stdout;
console.log = function(d) { //
    var date = new Date();
    var logpath = './logs/'+date.toDateString()+'.log';
    fs.access(logpath, fs.F_OK, (err) => {
        if (err) {
            fs.writeFile(logpath, 'Log for '+date.toDateString(), function (err) {
                if (err) throw err;
                console.log('File is created successfully.');
            });
            return;
        }
    });

    var log_file = fs.createWriteStream(logpath, {flags : 'a+'});
    log_file.write(util.format(d) + '\n');
    log_file.close();
    log_stdout.write(util.format(d) + '\n');
};

app.use('/', express.static(__dirname + "/ui"));

const pool = require('./src/database');

app.get('/getUsers', (req, res) => {
	getAllUsers()
    .then( result => {
        res.json({success: true, users: result}); 
    })
    .catch(error => {
        console.log(error);
        res.json({success: false, message: 'An errored occured.'}); 
    });
})

const getAllUsers = async () => {
    const result = await pool.query(`select * from user where deleted = '0'`);
    return result;
}

app.post('/user', (req, res) => {
    let newuser = req.body;

    let error = false;
    let message = new Array();
    
    for( let input in newuser )
    {
        if( typeof newuser[input] == 'undefined' || newuser[input] == '' )
        {
            error = true;
            message.push(input.toUpperCase() + ' is required.');
        }   
    }

    if( error ) {
        res.json({success: false, message: message.join(' ')});   
    }

    createUser(newuser)
    .then( result => {
        let newUserId = result.insertId;
        res.json({success: true, message: 'User successfully created.'}); 
    })
    .catch(error => {
        console.log(error);
        if( error.code === 'ER_DUP_ENTRY' )
            res.json({success: false, message: 'Username already exists.'}); 
        else
         res.json({success: false, message: 'An errored occured.'}); 
    });
});


const createUser = async ({ username, firstname, lastname, email, mobile }) => {
    const result = await pool.query(`insert into user(username, firstname, lastname, email, mobile) values(?,?,?,?,?)`, [username, firstname, lastname, email, mobile]);
    return result;
}

app.get('/user/:userid', (req, res) => {
    const userid = req.params.userid;
    getUserById(userid)
    .then( result => {
        if( result.length == 1 )
        {
            res.json({success: true, user: result[0]}); 
        }
        else{
            res.json({success: false, message: 'Record not found.'});   
        }
    })
    .catch(error => {
        console.log(error);
        res.json({success: false, message: 'An errored occured.'}); 
    });

});

const getUserById = async (userid) => {
    const result = await pool.query(`select * from user where userid = ? and deleted = '0'`, [userid]);
    return result;
}

app.put('/user/:userid', (req, res) => {
    const userid = req.params.userid;
    const userinfo = req.body;
    
    updateUserById({userid, ...userinfo})
    .then( result => {
        console.log(result)
        if( result.affectedRows == 1 )
        {
            res.json({success: true, message: 'Record successfully updated.'}); 
        }
        else{
            res.json({success: false, message: 'Record not found.'});   
        }
    })
    .catch(error => {
        console.log(error);
        res.json({success: false, message: 'An errored occured.'}); 
    });

});

const updateUserById = async ({userid, firstname, lastname, email, mobile}) => {
    const result = await pool.query(`update user set firstname = ?, lastname = ?, email = ?, mobile = ?, datemodified = CURRENT_TIMESTAMP  where userid = ? and deleted = '0'`, [firstname, lastname, email, mobile, userid]);
    return result;
}

app.delete('/user/:userid', (req, res) => {
    const userid = req.params.userid;
    
    deleteUserById(userid)
    .then( result => {
        console.log(result)
        if( result.affectedRows == 1 )
        {
            res.json({success: true, message: 'Record successfully deleted.'}); 
        }
        else{
            res.json({success: false, message: 'Record not found.'});   
        }
    })
    .catch(error => {
        console.log(error);
        res.json({success: false, message: 'An errored occured.'}); 
    });

});

const deleteUserById = async (userid) => {
    const result = await pool.query(`update user set deleted = '1', datedeleted = CURRENT_TIMESTAMP  where userid = ? and deleted = '0'`, [userid]);
    return result;
}

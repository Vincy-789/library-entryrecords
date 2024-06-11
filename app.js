const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const moment = require('moment-timezone');
require('dotenv').config();
const { Console } = require('console');
const { isNull } = require('util');
const { version } = require('os');

const app = express();
const port = 5019;

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')));
app.set('view engine', 'ejs');
// app.use('/scripts', express.static(path.join(__dirname, '/node_modules/quagga/dist/')));
app.use('/scripts', express.static(path.join(__dirname, '/public/assets/quagga/dist/')));

const Today = moment().tz('Asia/Kolkata');

mongoose.connect(`mongodb+srv://${process.env.MN_DB_USER}:${process.env.MN_DB_PASSWORD}@cluster789.lbkeoqk.mongodb.net/libEntryRecords?retryWrites=true&w=majority&appName=Cluster789`);

const dataSchema = new mongoose.Schema({
    id_number: String,
    entry: String,
    exit: String,
});
const loginSchema = new mongoose.Schema({
    email: String,
    pass: String,
});

// const currentDate = new Date();

const day = Today.format('DD');
const month = Today.format('MM');
const year = Today.format('YYYY');

const collectionName = `data_${day}_${month}_${year}_i`;
const loginCollection = "passwords";
const LoginModel = mongoose.model(loginCollection, loginSchema);
const searchedCollection = [0];
const collectionNames = [];
let inputDate = "";

const colName = [collectionName];
const DataModel = mongoose.model(colName[0], dataSchema);

app.use(express.urlencoded({ extended: true })); // Middleware to parse form data

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/public/index.html`);
});

app.get('/login', (req, res) => {
    res.render('login',{msg: "", smsg:""});
});

app.post('/usercheck', async (req, res) => {
    const userEmail = req.body.inputEmail;
    const userPassword = req.body.inputPassword;

    try {
        const user = await LoginModel.findOne({ email: userEmail });
        if (user) {
            if (user.pass == userPassword) {
                res.redirect('/mainpage');
            } else {
                res.render('login', {
                    msg: "Wrong password!",
                    smsg: ""
                });
            }
        } else {
            res.render('login', {
                msg: "user not found!",
                smsg: "",
            });
        }
    } catch (error) {
        console.error("An error occurred:", error.message);
        res.redirect('/login');
    }

});

app.get('/mainpage', (req, res) => {
    res.sendFile(`${__dirname}/public/main.html`);
})

app.get('/scan', (req, res) => {
    res.sendFile(`${__dirname}/public/scanpage.html`);
})

app.get('/allrecords', async (req, res) => {
    try {
        if (colName.length > 0) {
            const retriveModel = mongoose.model(colName[0], dataSchema);
            const doc = await retriveModel.find();
            console.log(doc.length);
            if (doc.length === 0) {
                res.render('allRecords', { status: "No data found", array: [], dateOfRecord: colName[0] });
            }
            res.render('allRecords', { array: doc, status: "", dateOfRecord: colName[0] });
        } else {
            console.log("length is 0");
            res.render('allRecords', { status: "No data found", array: [], dateOfRecord: inputDate });
        }
    } catch (error) {
        console.error("an erroroccured");
        res.redirect('/mainpage');
    }

});

app.post('/onerecord', async (req, res) => {
    colName.length = 0;
    try {
        const receivedDate = req.body.myDate;
        const currentDate = new Date(receivedDate);
        const day = currentDate.getDate().toString().padStart(2, "0");
        const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
        const year = currentDate.getFullYear();
    
        const recordName = `data_${day}_${month}_${year}_is`;
        inputDate = recordName;

        const docs = await mongoose.connection.db.listCollections().toArray();
        let isPresent = false;
        docs.forEach((item) => {
            if (item.name === recordName) {
                isPresent = true;
            }
        });

        if (isPresent) {
            colName.push(recordName);
            console.log(colName);
            res.redirect('/allrecords');
        } else {
            colName.length = 0;
            res.redirect('/allrecords');
        }
        
    } catch (err) {
        console.log(err);
        res.redirect('/mainpage');
    }
});

app.post('/process-barcode', async (req, res) => {
    const id_number = req.body.barcode;
    console.log(id_number);
    const isAM = Today.hour() < 12;
    const thisTime = `${Today.format('hh')}:${Today.format('mm')} ${isAM ? 'AM':'PM'}`;

    try {
        const nsmber = id_number;
        const item = await DataModel.findOne({ id_number: nsmber , __v:0});
        // const item = items[4];
        if (item) {
            console.log(item);
            console.log(item._id);
            await DataModel.updateOne({ _id: item._id }, { exit: thisTime, __v: 1 })
                .then(() => {
                    setTimeout(() => {
                        res.redirect('/scan');
                    }, 1200);
                });
        } else {
            // console.log(item);
            // console.log("No matching document found.");
            const newData = await new DataModel({
                            id_number: id_number,
                            entry: thisTime,
                        });
            await newData.save()
                .then(() => {
                    setTimeout(() => {
                        res.redirect('/scan');
                    }, 1200);
                });
        }
    } catch (error) {
        console.error("An error occurred:", error.message);
        res.redirect('/mainpage');
    }
    
});

app.get('/forgot-password', async(req, res) => {
    res.render('forgot', {errMsg: ""});
})

app.post('/changepassword', async (req, res) => {
    const userEmail = await req.body.inputEmail;
    const newPassword = await req.body.inputPassword;
    
    try {
        const doc = await LoginModel.findOne({ email: userEmail });
        console.log(doc);
        if (doc) {
            console.log(doc);
            await LoginModel.updateOne({ email: userEmail }, { pass: newPassword })
                .then(res.render('login',{msg: "", smsg: "updated successfully! please Login"}));
        } else {
            res.render('forgot', { errMsg: "email not found!" });
        }
    } catch (error) {
        console.log("error Occurred");
        res.redirect('/login');
    }
});

app.get('/addnewadmin', (req, res) => {
    res.render('newAdmin', {msg:""});
})

app.post('/addnewadmin', async (req, res) => {
    const userEmail = await req.body.inputEmail;
    const userPassword = await req.body.inputPassword;
    
    try {
        const doc = await LoginModel.findOne({ email: userEmail });
        console.log(doc);
        if (doc) {
            res.render('newAdmin', { msg: "Already exist! Try another." })
        } else {
            const newAdmin = new LoginModel({
                email: userEmail,
                pass: userPassword,
            });
            await newAdmin.save().then(res.render('login', {
                msg: "",
                smsg: "added new admin, Login please",
            }));
        }
    } catch (error) {
        console.log("error Occurred");
        res.redirect('/login');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
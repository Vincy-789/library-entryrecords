const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
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
app.use('/scripts', express.static(path.join(__dirname, '/node_modules/quagga/dist/')));

mongoose.connect(`mongodb+srv://${process.env.MN_DB_USER}:${process.env.MN_DB_PASSWORD}@cluster789.lbkeoqk.mongodb.net/libEntryRecords?retryWrites=true&w=majority&appName=Cluster789`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const dataSchema = new mongoose.Schema({
    id_number: String,
    entry: String,
    exit: String,
});
const loginSchema = new mongoose.Schema({
    email: String,
    pass: String,
});

const currentDate = new Date();
const day = currentDate.getDate().toString().padStart(2, "0");
const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
const year = currentDate.getFullYear();
// const collectionName = 'data_${currentDate.toISOString().substr(0, 10)}';

const collectionName = `data_${day}_${month}_${year}_i`;
// const DataModel = mongoose.model(collectionName, dataSchema);
const loginCollection = "passwords";
const LoginModel = mongoose.model(loginCollection, loginSchema);
const searchedCollection = [0];
const collectionNames = [];

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
    const DataModel = mongoose.model(colName[0], dataSchema);

    try {
        const doc = await DataModel.find();
        console.log(doc.length);
        if (doc.length === 0) {
            res.render('allrecords', { status: "No data found", array: doc, dateOfRecord: colName[0] });
        }
        res.render('allRecords', { array: doc, status: "", dateOfRecord: colName[0] });
    } catch (error) {
        console.error("an erroroccured");
        res.redirect('/mainpage');
    }

    // collectionNames.length = 0;
    // try {
    //     await mongoose.connection.db.listCollections().toArray().then((collections, err) => {
    //         if (err) {
    //             console.error("error occurred.");
    //         } else {
    //             console.log(collections);
    //             for (let i = 0; i < (collections.length - 2); i++){
    //                 if (collectionNames.indexOf(collections[i].name) === -1 && collections[i].name !== 'passwords') {
    //                     collectionNames.push(collections[i].name);
    //                 }
    //             }
    //             if (collectionNames.indexOf(collections[collections.length - 1].name)) {
    //                 collectionNames.push(collections[collections.length - 1].name);
    //             }
    //             if (collectionNames.indexOf(collections[collections.length - 2].name)) {
    //                 collectionNames.push(collections[collections.length - 2].name);
    //             }
    //             // console.log(collectionNames);
    //         }
    //     });

    //     if (searchedCollection.length !== 0) {
    //         const DataModel = mongoose.model(collectionNames[searchedCollection[0]], dataSchema);
    //         const allData = await DataModel.find({});
    //         await res.render('allRecords', {
    //             entries: allData,
    //             collectionList: collectionNames,
    //             dateOfRecord: collectionNames[searchedCollection[0]],
    //          });
    //     }
    // } catch (err) {
    //     console.error("error occurred");
    //     res.redirect('/allrecords');
    // }

});

app.post('/onerecord', async (req, res) => {
    colName.length = 0;
    try {
        const receivedDate = req.body.myDate;
        const currentDate = new Date(receivedDate);
        const day = currentDate.getDate().toString().padStart(2, "0");
        const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
        const year = currentDate.getFullYear();
    
        const recordName = `data_${day}_${month}_${year}_i`;
        colName.push(recordName);
        console.log('Received date:', receivedDate)
        res.redirect('/allrecords');
    } catch (err) {
        console.log(err);
        res.redirect('/mainpage');
    }
    // searchedCollection.length = 0;
    // const submitted = await req.body.dateOfCollection;
    // console.log(submitted);
    // searchedCollection.push(submitted);
    // res.redirect('/allrecords');
});

app.post('/process-barcode', async (req, res) => {
    const id_number = req.body.barcode;
    console.log(id_number);
    const currentTime = new Date();
    const thisTime = `${currentTime.getHours()}:${currentTime.getMinutes()}`;

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
            console.log(item);
            console.log("No matching document found.");
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
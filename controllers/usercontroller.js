const usermodels = require('../models/user');
const db = usermodels.getAccount;
const bcrypt = require('bcryptjs');


class userController {
    showSignup(req, res) {
        req.logout();
        req.session.destroy();
        if (req.user != undefined && req.user != null)
        {
            router.redirect('/');
        }
        res.render('signup_in', {
            title: 'Sign in/ Sign up',
            checksignin: true,
            messenger: req.user
        });
    }

    showAccount(req, res) {
        var checkuser = false;
        var nameuser;
        if (req.user) {
            checkuser = true;
            nameuser=req.user.name;
            var isSeller = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }
        res.render('account', {
            title: 'Account',
            checkuser,
            nameuser,
            account:req.user,
        });
    }
    showchangepassword(req,res){
        var checkuser = false;
        var nameuser;
        if (req.user) {
            checkuser = true;
            nameuser=req.user.name;
            var isSeller = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }
        res.render('changepassword', {
            title: 'Change password',
            checkuser,
            nameuser,
            account:req.user,
        });
    }
    async setPostSignup(req, res) {
        var arr = [];
        var a = +req.body.a;
        var b = +req.body.b;
        var c = a + b;
        var captcha = +req.body.captcha;

        var checkInfor = {
            fullname: req.body.fullname,
            name: req.body.name,
            pass: req.body.password,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            status: req.body.status,
        };

        // kiem tra username co ton tai hay k
        await db.find({
            name: checkInfor.name
        }).then(function (docs) {
            // arr.push(docs);
            docs.forEach(element => {
                arr.push(element);
            })
        });
        if (arr.length != 0) {
            // res.redirect('/users/signup');
            res.render('signup_in', {
                title: 'Sign in/ Sign up',
                errusername: "*Username exist!",
                checksignup: true
            });
            arr = [];
        }
        // kiem tra mat khau lon hon 6 ki tu
        if (checkInfor.pass.length < 6) {
            res.render('signup_in', {
                title: 'Sign in/ Sign up',
                errpass: "*Password must be at least 6 characters!",
                checksignup: true
            });
        }
        // kiem tra mat khau nhap lai co khop k
        var repass = req.body.repassword;
        if (!(repass === checkInfor.pass)) {
            res.render('signup_in', {
                title: 'Sign in/ Sign up',
                errrepass: "*Do not match!",
                checksignup: true
            });
        }

        // kiem tra email tai hay k
        var i = 0;
        var temp = 1;
        for (i; i < checkInfor.email.length; i = i + 1) {

            if (checkInfor.email[i] === ' ') {
                temp = 0;
                i = checkInfor.email.length;
            } else {
                if (checkInfor.email[i] === '@') {
                    var a = "";
                    i = i + 1;
                    for (i; i < checkInfor.email.length; i++) {
                        a = a + checkInfor.email[i];
                        //a.push(checkInfor.email[j]);
                    }
                    if (a === "gmail.com" || a === "yahoo.com") {
                        temp = 1;
                    } else {
                        temp = 0;
                    }
                }
            }

        }
        if (temp === 0) {
            res.render('signup_in', {
                title: 'Sign in/ Sign up',
                erremail: "*Email wrong!",
                checksignup: true
            });
        }
        await db.find({
            email: checkInfor.email
        }).then(function (docs) {
            // arr.push(docs);
            docs.forEach(element => {
                arr.push(element);
            })
        });
        if (arr.length != 0) {
            // res.redirect('/users/signup');
            res.render('signup_in', {
                title: 'Sign in/ Sign up',
                erremail: "*Email exist!",
                checksignup: true
            });
            arr = [];
        }

        //kiem tra so dien thoai
        await db.find({
            phone: checkInfor.phone
        }).then(function (docs) {
            // arr.push(docs);
            docs.forEach(element => {
                arr.push(element);
            })
        });
        if (arr.length != 0) {
            // res.redirect('/users/signup');
            res.render('signup_in', {
                title: 'Sign in/ Sign up',
                errphone: "*Phone number exist!",
                checksignup: true
            });
            arr = [];
        }

        // kiem tra captcha
        if (c != captcha) {
            res.render('signup_in', {
                title: 'Sign in/ Sign up',
                errcaptcha: "*Captcha wrong!",
                checksignup: true
            });
        } else {
            await usermodels.hashPassword(checkInfor.pass).then(function (doc) {
                const user = {
                    fullname: checkInfor.fullname,
                    name: checkInfor.name,
                    pass: doc,
                    phone: checkInfor.phone,
                    email: checkInfor.email,
                    address: checkInfor.address,
                    status: checkInfor.status,
                }
                usermodels.insert(user);
                res.redirect('/');
            });
        }
    }
    async setPostAccount(req,res){
        // var iduser=req.user._id;

        var myquery = {
            _id: req.user._id
        }
        var changeAcc={
            fullname:req.body.fullnamechange,
            phone:req.body.phonechange,
            address:req.body.addresschange,
        };
        var options = {
            multi: true
        }
        // usermodels.UpdateInfoAccount(changeAcc,iduser);
        await db.update(myquery,changeAcc,options);
        res.redirect('/../users/account');
    }

    async setPostPassword(req,res){
        var oldpass=req.body.oldpass;
        var newpass=req.body.newpass;
        var renewpass=req.body.renewpass;
        bcrypt.compare(oldpass,req.user.pass,(err,isMatch)=>{
            if(err) throw err;
            if(!isMatch) {
                res.render('changepassword', {
                    title: 'Change password',
                    erroldpass:"Password wrong",
            });
            }
        });
        // kiem tra mat khau lon hon 6 ki tu
        if (newpass < 6) {
            res.render('changepassword', {
                title: 'Change password',
                errnewpass: "*Password must be at least 6 characters!",
            });
        }
        // kiem tra mat khau nhap lai co khop k
        if (!(newpass === renewpass)) {
            res.render('changepassword', {
                title: 'Change pasword',
                errrenewpass: "*Do not match!",
            });
        }
        var change;
        await usermodels.hashPassword(newpass).then(function (doc) {
            change=doc;
        });
        var myquery = {
            _id: req.user._id
        }
        var changePass={
            pass:change,
        };
        var options = {
            multi: true
        }
        // usermodels.UpdateInfoAccount(changeAcc,iduser);
        await db.update(myquery,changePass,options);
        res.redirect('/../users/account');
    }

}


module.exports = userController;
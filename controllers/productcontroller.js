const productmodels = require('../models/products');
const dbproduct = productmodels.getProduct;

const biddingmodels = require('../models/bidding');
const dbbidding = biddingmodels.getBidding;

const reviewsmodels = require('../models/review');
const dbreviews = reviewsmodels.getReviews;

const categoriesmodels = require('../models/category');
const dbcategory = categoriesmodels.getCategory;

const cartmodels = require('../models/cart');
const dbcart = cartmodels.getCart;

const pointbidcontroller = require('../models/pointbidder');
const dbpointbid = pointbidcontroller.getpointbidder;

const usermodels = require('../models/user');
const dbuser = usermodels.getAccount;

const moment = require('moment');
var ObjectId = require('mongodb').ObjectId;
const config = require('../config/default.json');

class productController {

    //:id/categories
    async showProduct(req, res) {
        var checkuser = false;
        var nameuser;
        if (req.user) {
            checkuser = true;
            nameuser = req.user.name;
            var isSeller = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }
        var category = req.params.id;
        var limit = config.paginate.limit;
        var arrproduct = [];
        var total = 0;
        const now = moment(new Date());
        var arrendding = [];

        await dbproduct.find({
            selling: true
        }).then(docs => {
            docs.forEach(element => {
                arrendding.push(element);
            })
        })
        //check endding and update cart

        for (var i = 0; i < arrendding.length; i++) {

            const time = arrendding[i].datetime;
            const c = now.diff(time, 'seconds');
            if (c < 600) {
                arrendding[i].new = true;
            }

            if ((arrendding[i].datetimeproduct * 24 * 3600 + arrendding[i].moretime) <= c) {


                const entity = {
                    selling: false
                };

                const myquery = {
                    _id: arrendding[i]._id
                };
                var options = {
                    multi: true
                };

                //upadte bidding
                const filter = {
                    idsanpham: arrendding[i]._id.toString()
                };
                const update = {
                    selling: false
                };
                await dbbidding.update(filter, update, options);

                //update cart
                var pricebuy = 0,
                    pricebid = 0;
                var datetemp = "";
                var arrtemp = {};
                await dbbidding.findOne({
                    idsanpham: arrendding[i]._id.toString()
                }).then(doc => {
                    arrtemp = doc;
                });
                if (arrtemp.currentwinner === arrtemp.bidding[arrtemp.bidding.length - 1].user) {
                    var k = arrtemp.bidding.length - 1;
                    datetemp = arrtemp.bidding[k].datebid;
                    pricebid = arrtemp.bidding[k].giadau;
                    pricebuy = arrtemp.bidding[k - 1].giadau + arrendding[i].buocdaugia;
                } else {
                    for (var i = arrtemp.soluot - 2; i >= 0; i--) {
                        if (arrtemp.currentwinner === arrtemp.bidding[i].user) {
                            datetemp = arrtemp.bidding[i].datebid;
                            pricebid = arrtemp.bidding[i].giadau;
                            pricebuy = arrtemp.bidding[i].giadau;
                            break;
                        }
                    }
                }

                const entitycart = {
                    user: arrtemp.currentwinner,
                    idsanpham: arrtemp.idsanpham,
                    giadau: pricebid,
                    giaphaitra: pricebuy,
                    dateadd: datetemp
                }
                cartmodels.insert(entitycart);

                //update product
                await dbproduct.update(myquery, entity, options);
                arrendding[i].selling = false;
                await dbuser.findOne({
                    name: arrendding[i].user
                }).then(doc => {
                    if (doc) {
                        usermodels.sendemail(req, res, doc.email, "Thông báo", "Sản phẩm của bạn đã kết thúc đấu giá!");
                    }
                })
            }
        }

        var listCategories = [];
        await dbcategory.find({}).sort({
            idcat: 1
        }).then(docs => {
            docs.forEach(element => {
                listCategories.push(element);
            })
        })
        let page = req.query.page || 1;
        console.log("page: " + page);
        if (page < 1) {
            page = 1;
        }

        const offset = (page - 1) * config.paginate.limit;

        for (var i = 0; i < listCategories.length; i++) {
            if (listCategories[i].idcat === category) {
                listCategories[i].isActive = true;
                if (category === 'all') {

                    await dbproduct.find({
                        selling: true,
                    }).skip(offset).limit(limit).then(docs => {
                        docs.forEach(element => {
                            arrproduct.push(element);
                        })
                    });
                    //count
                    total = await dbproduct.find({
                        selling: true,
                    }).count();
                } else {
                    await dbproduct.find({
                        selling: true,
                        loai: listCategories[i].idcat
                    }).skip(offset).limit(limit).then(docs => {
                        docs.forEach(element => {
                            arrproduct.push(element);
                        })
                    });
                    //count
                    total = await dbproduct.find({
                        selling: true,
                        loai: listCategories[i].idcat
                    }).count();
                }
            } else {
                listCategories[i].isActive = false;
            }
        }


        var checkuser = false;
        var nameuser;
        if (req.user) {
            checkuser = true;
            nameuser = req.user.name;
            var isSeller = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }



        for (var i = 0; i < arrproduct.length; i++) {

            const time = arrproduct[i].datetime;
            const c = now.diff(time, 'seconds');
            if (c < 600) {
                arrproduct[i].new = true;
            }

            if ((arrproduct[i].datetimeproduct * 24 * 3600 + arrproduct[i].moretime) > c) {
                var temp = arrproduct[i].datetimeproduct * 24 * 3600 + arrproduct[i].moretime - c;
                arrproduct[i].datetimeproduct = temp;
            } else {
                const entity = {
                    selling: false
                };

                const myquery = {
                    _id: arrproduct[i]._id
                };
                var options = {
                    multi: true
                };



                await dbproduct.update(myquery, entity, options);
                arrproduct[i].selling = false;

            }
        }



        let nPages = Math.floor(total / limit);

        if (total % limit > 0) nPages++;
        const page_numbers = [];
        for (i = 1; i <= nPages; i++) {
            page_numbers.push({
                value: i,
                isCurrentPage: i === +page
            })
        }

        for (var i = 0; i < arrproduct.length; i++) {
            arrproduct[i].soluot = 0;
            await dbbidding.findOne({
                idsanpham: arrproduct[i]._id.toString()
            }).then(doc => {
                if (doc) {
                    arrproduct[i].soluot = doc.soluot;
                }
            });
        }

        res.render('product', {
            title: 'Product',
            list: arrproduct,
            listCategories,
            checkuser,
            isSeller,
            page_numbers,
            prev_value: +page - 1,
            next_value: +page + 1,
            checkuser,
            nameuser,

        });
    };
    showUpload(req, res) {
        var checkuser = false;
        if (req.user) {
            checkuser = true;
            var isSeller = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }
        res.render('upload', {
            title: 'Upload product',
            checkuser,
            isSeller,
            nameuser: req.user.name,
        });
    }

    async showTopBidding(req, res) {
        var giacaonhat = [];
        var ragianhieunhat = [];
        var thoigiansaphet = [];
        // thoi gian sap het
        await dbproduct.find({}).sort({
            datetimeproduct: -1
        }).limit(5).then((docs) => {
            docs.forEach(element => {
                thoigiansaphet.push(element);
            })
        })
        //nhieu danh gia nhat
        await dbproduct.find({}).limit(5).then((docs) => {
            docs.forEach(element => {
                ragianhieunhat.push(element);
            })
        })

        //gia cao nhat
        await dbproduct.find({}).sort({
            giahientai: -1
        }).limit(5).then(docs => {
            docs.forEach(element => {
                giacaonhat.push(element);
            })
        })
        res.render('topbidding', {
            title: 'Top Bidding',
            mostprices: giacaonhat,
            mostbids: ragianhieunhat,
            neartimeout: thoigiansaphet
        });
    }
    async showDetailProduct(req, res) {
        var checkuser = false;
        var nameuser;
        if (req.user) {
            checkuser = true;
            nameuser = req.user.name;
            var isSeller = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }
        var id = req.params.id;
        var product = {};
        await dbproduct.findOne({
            "_id": ObjectId(id)
        }).then(doc => {
            product = doc;
        });
        var checkuser = false;
        var isSeller = true;
        if (req.user) {
            checkuser = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }
        var isMine = false;
        if (product.user === req.user.name) {
            isMine = true;
        }

        //comment
        var reviews = [];
        await dbreviews.find({
            user: product.user
        }).then(docs => {
            docs.forEach(element => {
                reviews.push(element);
            });
        });

        var avgrate = 0;
        for (var i = 0; i < reviews.length; i++) {
            avgrate = avgrate + reviews[i].rate;

        }

        avgrate = avgrate / reviews.length;
        var x = parseFloat(avgrate);
        avgrate = Math.round(x * 100) / 100;


        //number of bid
        var numofbid = 0;
        var biddingofproduct = {};
        await dbbidding.findOne({
            idsanpham: id
        }).then(doc => {
            if (doc) {
                numofbid = doc.soluot;
                biddingofproduct = doc;
            }
        });

        // show list bidder
        var listbid = [];
        await dbbidding.findOne({
            idsanpham: id
        }).then(doc => {
            if (doc) {
                listbid = doc.bidding;
            }

        });
        for (var i = 0; i < listbid.length; i++) {
            await dbpointbid.findOne({
                user: listbid[i].user
            }).then(doc => {
                if (doc) {
                    listbid[i].point = doc.pluspoint - doc.minuspoint;

                } else {
                    listbid[i].point = 0;
                }
            })
        }

        //mask bid winner
        var currentwinner = "";
        if (biddingofproduct.currentwinner) {
            currentwinner = biddingofproduct.currentwinner.toString();

        } else {
            currentwinner = "Nobody";
        }

        var nearproducts = [];
        await dbproduct.find({
            selling: true,
            loai: product.loai
        }).limit(5).then(docs => {
            docs.forEach(element => {
                nearproducts.push(element);
            })
        });

        //bidding
        for (var i = 0; i < nearproducts.length; i++) {
            nearproducts[i].soluot = 0;
            await dbbidding.findOne({
                idsanpham: nearproducts[i]._id.toString()
            }).then(doc => {
                if (doc) {
                    nearproducts[i].soluot = doc.soluot;
                }
            });
        }

        //countimer
        const now = moment(new Date());

        for (var i = 0; i < nearproducts.length; i++) {

            const time = nearproducts[i].datetime;
            const c = now.diff(time, 'seconds');
            if (c < 600) {
                nearproducts[i].new = true;
            }

            if ((nearproducts[i].datetimeproduct * 24 * 3600 + nearproducts[i].moretime) > c) {
                var temp = nearproducts[i].datetimeproduct * 24 * 3600 + nearproducts[i].moretime - c;
                nearproducts[i].datetimeproduct = temp;
            } else {
                const entity = {
                    selling: false
                };

                const myquery = {
                    _id: nearproducts[i]._id
                };
                var options = {
                    multi: true
                };

                await dbproduct.update(myquery, entity, options);
                nearproducts[i].selling = false;

            }
        }
        if (!avgrate) {
            avgrate = 0;
        }

        for (var i = 0; i < listbid.length; i++)
        {
            listbid[i].idsanpham = id+"";
        }

            res.render('detailproduct', {
                title: 'Detail product',
                product: product,
                checkuser,
                isSeller,
                rate: avgrate,
                reviews,
                numofbid,
                numreviews: reviews.length,
                // arrdetails,
                currentwinner,
                nearproducts,
                listbid,
                isMine,
                id,
                checkuser,
                nameuser,
            });
    }
    async showEditEdittor(req, res) {
        var checkuser = false;
        var nameuser;
        if (req.user) {
            checkuser = true;
            nameuser = req.user.name;
            var isSeller = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }
        var idsanpham = req.params.id;
        var product = {};
        await dbproduct.findOne({
            _id: ObjectId(idsanpham)
        }).then(doc => {
            product = doc;
            product.idsanpham = idsanpham;
        })
        res.render('editedittor', {
            title: "Edit Infor Product",
            product,
            checkuser,
            nameuser,
        })
    }
    //post
    async postDeleteBidding(req,res){
        var idpro=req.params.idpro;
        var user=req.params.namebid;
        var listbid=[];
        var bid={};
        await dbbidding.findOne({idsanpham:idpro}).then(doc=>{
            listbid=doc.bidding;
            bid=doc;
        });
        var templistbid=[];
        for(var i=0;i<listbid.length;i++){
            if(listbid[i].user!=user){
                templistbid.push(listbid[i]);
            }
        }
        var myquery = {
            _id: ObjectId(bid._id),
        }
        var changeAcc = {
            bidding:templistbid,
        };
        var options = {
            multi: true
        }
        // usermodels.UpdateInfoAccount(changeAcc,iduser);
        await dbbidding.update(myquery, changeAcc, options);
        res.redirect("/products/detailproduct/"+idpro);
    }
    postUpload(req, res) {
        var img = [];
        img.push(req.body.url);
        img.push(req.body.url1);
        img.push(req.body.url2);
        var temp = 0;
        var sldate = req.body.selectdate;
        if (sldate === "ngay") {
            temp = 1;
        } else if (sldate === "tuan") {
            temp = 7;
        } else {
            temp = 30;
        }
        var entity = {
            image: img,
            ten: req.body.nameproduct,
            giahientai: +req.body.beginprice,
            giatoithieu: +req.body.miniprice,
            giamuangay: +req.body.buynow,
            buocdaugia: +req.body.stepprice,
            loai: req.body.selname,
            datetime: req.body.dob,
            datetimeproduct: +temp * req.body.timeproduct,
            moretime: 0,
            ghichu: req.body.ghichu,
            selling: true,
            user: req.user.name
        }



        productmodels.insert(entity);
        res.redirect('/users/myproducts')
    }
    async postSearch(req, res) {
        var category = req.params.id;

        var sort = req.body.select;
        var arrproduct = [];
        var search = req.body.search;
        var total = 0;

        var listCategories = [];
        await dbcategory.find({}).sort({
            idcat: 1
        }).then(docs => {
            docs.forEach(element => {
                listCategories.push(element);
            })
        })

        var checkselect = {
            macdinh: false,
            giatangdan: false,
            giagiamdan: false,
            thoigiangiamdan: false,
            thoigiantangdan: false
        }

        var temp = {
            value: 1,
            name: "thoigiangiamdan"
        };

        if (sort === "giagiamdan") {
            temp.name = "gia";
            temp.value = -1;
        } else if (sort === "giatangdan") {
            temp.name = "gia";
            temp.value = 1;
        }


        var limit = config.paginate.limit;

        let page = req.query.page || 1;
        if (page < 1) {
            page = 1;
        }

        const offset = (page - 1) * config.paginate.limit;

        if (search) {

            for (var i = 0; i < listCategories.length; i++) {
                if (listCategories[i].idcat === category) {
                    if (temp.name === 'gia') {
                        if (category === 'all') {
                            listCategories[i].isActive = true;
                            await dbproduct.find({
                                $text: {
                                    $search: req.body.search
                                },
                                selling: true,
                            }).sort({
                                giahientai: temp.value
                            }).skip(offset).limit(limit).then(docs => {
                                docs.forEach(element => {
                                    arrproduct.push(element);
                                })
                            });
                            total = await dbproduct.find({
                                selling: true,
                            }).count();
                        } else {
                            listCategories[i].isActive = true;
                            await dbproduct.find({
                                $text: {
                                    $search: req.body.search
                                },
                                selling: true,
                                loai: listCategories[i].idcat
                            }).sort({
                                giahientai: temp.value
                            }).skip(offset).limit(limit).then(docs => {
                                docs.forEach(element => {
                                    arrproduct.push(element);
                                })
                            });
                            total = await dbproduct.find({
                                selling: true,
                                loai: listCategories[i].idcat

                            }).count();
                        }
                    } else {
                        listCategories[i].isActive = true;
                        if (listCategories[i].idcat === 'all') {
                            await dbproduct.find({
                                $text: {
                                    $search: req.body.search
                                },
                                selling: true,

                            }).sort({
                                giahientai: temp.value
                            }).skip(offset).limit(limit).then(docs => {
                                docs.forEach(element => {
                                    arrproduct.push(element);
                                })
                            });
                            total = await dbproduct.find({
                                selling: true,
                            }).count();
                        } else {
                            await dbproduct.find({
                                $text: {
                                    $search: req.body.search
                                },
                                selling: true,
                                loai: listCategories[i].idcat

                            }).sort({
                                giahientai: temp.value
                            }).skip(offset).limit(limit).then(docs => {
                                docs.forEach(element => {
                                    arrproduct.push(element);
                                })
                            });
                            total = await dbproduct.find({
                                selling: true,
                                loai: listCategories[i].idcat
                            }).count();
                        }
                    }
                }
            }
        } else {
            for (var i = 0; i < listCategories.length; i++) {
                if (listCategories[i].idcat === category) {
                    if (temp.name === 'gia') {
                        if (category === 'all') {
                            listCategories[i].isActive = true;
                            await dbproduct.find({
                                selling: true,
                            }).sort({
                                giahientai: temp.value
                            }).skip(offset).limit(limit).then(docs => {
                                docs.forEach(element => {
                                    arrproduct.push(element);
                                })
                            });
                            total = await dbproduct.find({
                                selling: true,
                            }).count();
                        } else {
                            listCategories[i].isActive = true;
                            await dbproduct.find({
                                selling: true,
                                loai: listCategories[i].idcat
                            }).sort({
                                giahientai: temp.value
                            }).skip(offset).limit(limit).then(docs => {
                                docs.forEach(element => {
                                    arrproduct.push(element);
                                })
                            });
                            total = await dbproduct.find({
                                selling: true,
                                loai: listCategories[i].idcat

                            }).count();
                        }
                    } else {
                        listCategories[i].isActive = true;
                        if (listCategories[i].idcat === 'all') {
                            await dbproduct.find({
                                selling: true,

                            }).sort({
                                giahientai: temp.value
                            }).skip(offset).limit(limit).then(docs => {
                                docs.forEach(element => {
                                    arrproduct.push(element);
                                })
                            });
                            total = await dbproduct.find({
                                selling: true,
                            }).count();
                        } else {
                            await dbproduct.find({
                                selling: true,
                                loai: listCategories[i].idcat

                            }).sort({
                                giahientai: temp.value
                            }).skip(offset).limit(limit).then(docs => {
                                docs.forEach(element => {
                                    arrproduct.push(element);
                                })
                            });
                            total = await dbproduct.find({
                                selling: true,
                                loai: listCategories[i].idcat
                            }).count();
                        }
                    }
                }
            }
        };

        var checkuser = false;
        if (req.user) {
            checkuser = true;
            var isSeller = true;
            if (req.user.status != "Seller") {
                isSeller = false;
            }
        }

        const now = moment(new Date());
        for (var i = 0; i < arrproduct.length; i++) {

            const time = arrproduct[i].datetime;
            const c = now.diff(time, 'seconds');
            if (arrproduct[i].datetimeproduct * 24 * 3600 > c) {
                var temp = arrproduct[i].datetimeproduct * 24 * 3600 - c;
                arrproduct[i].datetimeproduct = temp;
            } else {

                const entity = {
                    selling: false
                };

                const myquery = {
                    _id: arrproduct[i]._id
                };
                var options = {
                    multi: true
                };

                await dbproduct.update(myquery, entity, options);
                arrproduct[i].selling = false;

            }
        }



        let nPages = Math.floor(total / limit);

        if (total % limit > 0) nPages++;
        const page_numbers = [];
        for (i = 1; i <= nPages; i++) {
            page_numbers.push({
                value: i,
                isCurrentPage: i === +page
            })
        }

        if (sort === "thoigiantangdan") {
            var arrtemp = [];

            await dbproduct.find({
                selling: true,
            }).then(docs => {
                docs.forEach(element => {
                    arrtemp.push(element);
                });
            });

            //convert time to ss
            var n = arrtemp.length;
            for (var i = 0; i < n; i++) {

                const time = arrtemp[i].datetime;
                const c = now.diff(time, 'seconds');
                if (arrtemp[i].datetimeproduct * 24 * 3600 > c) {
                    var temp = arrtemp[i].datetimeproduct * 24 * 3600 - c;
                    arrtemp[i].datetimeproduct = temp;
                } else {

                    const entity = {
                        selling: false
                    };

                    const myquery = {
                        _id: arrtemp[i]._id
                    };
                    var options = {
                        multi: true
                    };

                    await dbproduct.update(myquery, entity, options);
                    arrtemp[i].selling = false;

                }
            }

            //sort 
            for (var i = 0; i < n; i++) {
                for (var j = i + 1; j < n; j++) {
                    if (arrtemp[i].datetimeproduct > arrtemp[j].datetimeproduct) {
                        var temp = arrtemp[i].datetimeproduct;
                        arrtemp[i].datetimeproduct = arrtemp[j].datetimeproduct;
                        arrtemp[j].datetimeproduct = temp;
                    }
                }
            }
            for (var i = 0; i < limit; i++) {
                arrproduct[i] = arrtemp[i];
            }

            listCategories[0].isActive = true;
            // listCategories[1].isActive = false;
            // listCategories[2].isActive = false;
            // listCategories[3].isActive = false;

        } else if (sort === "thoigiangiamdan") {
            var arrtemp = [];

            await dbproduct.find({
                selling: true,
            }).then(docs => {
                docs.forEach(element => {
                    arrtemp.push(element);
                });
            });
            //convert time to ss
            var n = arrtemp.length;
            for (var i = 0; i < n; i++) {

                const time = arrtemp[i].datetime;
                const c = now.diff(time, 'seconds');
                if (arrtemp[i].datetimeproduct * 24 * 3600 > c) {
                    var temp = arrtemp[i].datetimeproduct * 24 * 3600 - c;
                    arrtemp[i].datetimeproduct = temp;
                } else {

                    const entity = {
                        selling: false
                    };

                    const myquery = {
                        _id: arrtemp[i]._id
                    };
                    var options = {
                        multi: true
                    };

                    await dbproduct.update(myquery, entity, options);
                    arrtemp[i].selling = false;

                }
            }
            //sort 
            for (var i = 0; i < n; i++) {
                for (var j = i + 1; j < n; j++) {
                    if (arrtemp[i].datetimeproduct < arrtemp[j].datetimeproduct) {
                        var temp = arrtemp[i].datetimeproduct;
                        arrtemp[i].datetimeproduct = arrtemp[j].datetimeproduct;
                        arrtemp[j].datetimeproduct = temp;
                    }
                }
            }
            for (var i = 0; i < limit; i++) {
                arrproduct[i] = arrtemp[i];
            }

            listCategories[0].isActive = true;
            // listCategories[1].isActive = false;
            // listCategories[2].isActive = false;
            // listCategories[3].isActive = false;
        }


        for (var i = 0; i < arrproduct.length; i++) {
            arrproduct[i].soluot = 0;
            await dbbidding.findOne({
                idsanpham: arrproduct[i]._id.toString()
            }).then(doc => {
                if (doc) {
                    arrproduct[i].soluot = doc.soluot;
                }
            });
        }

        var thongbao = req.body.search;
        res.render('product', {
            title: 'Product',
            list: arrproduct,
            listCategories,
            checkuser,
            isSeller,
            page_numbers,
            prev_value: +page - 1,
            next_value: +page + 1,
            thongbao,
        });
    }

    async postEditInforProduct(req, res) {
        var idsanpham = req.params.id;
        var texthtml = req.body.ghichu;
        if (texthtml) {
            var product = {};
            await dbproduct.findOne({
                _id: ObjectId(idsanpham)
            }).then(doc => {
                product = doc;
            })
            if (product.moreghichu) {

                var today = new Date();
                var dd = today.getDate();
                var mm = today.getMonth() + 1; //January is 0!
                var hh = today.getHours();
                var ii = today.getMinutes();

                var yyyy = today.getFullYear();
                if (dd < 10) {
                    dd = '0' + dd;
                }
                if (mm < 10) {
                    mm = '0' + mm;
                }
                if (hh < 10) {
                    hh = '0' + hh;
                }
                if (ii < 10) {
                    ii = '0' + ii;
                }
                var today = yyyy + '/' + mm + '/' + dd + " " + hh + ":" + ii;
                var entity = {
                    date: today,
                    ghichu: texthtml
                }
                const filter = {
                    _id: product._id
                }
                product.moreghichu.push(entity);
                await dbproduct.findOneAndUpdate(filter, product);
            } else {
                var today = new Date();
                var dd = today.getDate();
                var mm = today.getMonth() + 1; //January is 0!
                var hh = today.getHours();
                var ii = today.getMinutes();

                var yyyy = today.getFullYear();
                if (dd < 10) {
                    dd = '0' + dd;
                }
                if (mm < 10) {
                    mm = '0' + mm;
                }
                if (hh < 10) {
                    hh = '0' + hh;
                }
                if (ii < 10) {
                    ii = '0' + ii;
                }
                var today = yyyy + '/' + mm + '/' + dd + " " + hh + ":" + ii;
                var entity = {
                    date: today,
                    ghichu: texthtml
                }
                const filter = {
                    _id: product._id
                }
                var arrghichu = [];
                arrghichu.push(entity);
                product.moreghichu = arrghichu;
                await dbproduct.findOneAndUpdate(filter, product);
                console.log(product);
            }
        }
        res.redirect('/users/myproducts');
    }

    async postCancelInforProduct(req, res) {
        redirect('/users/myproducts')
    }

}

module.exports = productController;
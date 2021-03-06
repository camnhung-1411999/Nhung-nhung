var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
// var hbs = require('hbs');
var exhbs = require('express-handlebars');
var hbs_sections = require('express-handlebars-sections');
var bodyParser = require('body-parser'); //databasevar dotenv = require('dotenv').config();
var passport = require('passport');
require('./config/passport')(passport);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var productRouter = require('./routes/products');
var rateandreviews = require('./routes/rateandreviews');


var app = express();

app.engine('hbs', exhbs({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    section: hbs_sections() //////
  }
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');




// use session
app.use(session({
  secret: "secret",
  saveUninitialized: true,
  resave: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    name: "data"
  }
}));



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());

// app.use(session({
//   secret: 'keyboard cat',
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: true }
// }))


app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json()); //database


//passport middleware
app.use(passport.initialize());
app.use(passport.session());


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/products', productRouter);
app.use('/rate-reviews',rateandreviews);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});   

module.exports = app;
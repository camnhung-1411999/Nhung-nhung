var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('hbs');
var exhbs = require('express-handlebars');
var hbs_sections = require('express-handlebars-sections');
var bodyParser = require('body-parser'); //databasevar dotenv = require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var productRouter = require('./routes/products');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');
app.engine('handlebars', exhbs({
  extname: ".hbs",
  defaultLayout: 'main',
  layoutsDir: __dirname + 'views/_layouts',
  // partialsDir: __dirname + '/views/partials/',
  helpers: {
    section: hbs_sections(),
    // section: function (name, options) {
    //   if (!this._sections) this._sections = {};
    //   this._sections[name] = options.fn(this);
    //   return null;
    // }
  }
}));




app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json()); //database

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/products', productRouter);

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
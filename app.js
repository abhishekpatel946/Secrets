//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// session configuration
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);
// initialize session
app.use(passport.initialize());
app.use(passport.session());

// DB connection
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);

// DB schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);

// define a longlasting secret key
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET_KEY,
//   encryptedFields: ["password"],
// });

// mongoose model
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// HOME route
app.route("/").get(function (req, res) {
  res.render("home");
});

// LOGIN route
app
  .route("/login")
  // .post(function (req, res) {
  //   const username = req.body.username;
  //   // const password = md5(req.body.password);
  //   const password = req.body.password;

  //   User.findOne({ email: username }, function (err, userFound) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       if (userFound) {
  //         bcrypt.compare(password, userFound, function (err, result) {
  //           if (result === true) {
  //             res.render("secrets");
  //           } else {
  //             res.render("login");
  //           }
  //         });
  //       } else {
  //         res.render("home");
  //       }
  //     }
  //   });
  // })
  .post(function (req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    req.login(user, function (err) {
      if (err) {
        console.log(err);
        res.redirect("/login");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    });
  })
  .get(function (req, res) {
    res.render("login");
  });

// REGISTER route
app
  .route("/register")
  // .post(function (req, res) {
  //   bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
  //     const newUser = new User({
  //       email: req.body.username,
  //       // password: md5(req.body.password),
  //       password: hash,
  //     });
  //     newUser.save(function (err) {
  //       if (err) {
  //         console.log(err);
  //       } else {
  //         res.render("secrets");
  //       }
  //     });
  //   });
  // })
  .post(function (req, res) {
    User.register(
      { username: req.body.username },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
          });
        }
      }
    );
  })
  .get(function (req, res) {
    res.render("register");
  });

// SECRETS routes
app.route("/secrets").get(function (req, res) {
  User.find({ secrets: { $ne: null } }, function (err, userFound) {
    if (err) {
      console.log(err);
    } else {
      if (userFound) {
        res.render("secrets", { usersWithSecrets: userFound });
      }
    }
  });
});

// SUBMIT SECRET routes
app
  .route("/submit")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post(function (req, res) {
    const submittedSecret = req.body.secret;
    console.log(req.user);
    User.findById(req.user.id, function (err, userFound) {
      if (err) {
        console.log(err);
      } else {
        if (userFound) {
          userFound.secret = submittedSecret;
          userFound.save(function () {
            res.redirect("/secrets");
          });
        }
      }
    });
  });

// LOGOUT routes
app.route("/logout").get(function (req, res) {
  req.logout();
  res.redirect("/");
});

// listener
app.listen(3000, function () {
  console.log("server started at port 3000...");
});

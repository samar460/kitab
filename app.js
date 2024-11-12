require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const usermodel = require("./models/user");
const postmodel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const upload = require("./config/multerconfig");

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

const isloggedin = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const decoded = jwt.verify(token, "shshshhhh");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send("Unauthorized: Invalid token");
  }
};

const isrealone = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await postmodel.findById(postId);

    if (!post) {
      return res.status(404).send("Post not found");
    }
    if (post.user.toString() !== req.user.userid.toString()) {
      return res.status(403).send("You do not have authorization to this post");
    }
    next();
  } catch (err) {
    //console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/uploaddp", (req, res) => {
  res.render("profileuploaddp");
});

app.post("/upload", isloggedin, upload.single("image"), async (req, res) => {
  const user = await usermodel.findOne({ email: req.user.email });

  user.profile = {
    data: req.file.buffer,
    contentType: req.file.mimetype,
  };

  await user.save();
  res.redirect("/profile");
});

app.get("/profile/image/:id", async (req, res) => {
  try {
    const user = await usermodel.findById(req.params.id);
    if (!user || !user.profile.data) {
      return res.status(404).send("Image not found");
    }
    res.set("Content-Type", user.profile.contentType);
    res.send(user.profile.data);
  } catch (error) {
    //console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isloggedin, async (req, res) => {
  try {
    let user = await usermodel
      .findOne({ email: req.user.email })
      .populate("posts");
    let allposts = await postmodel.find({}).populate("user", "username name");
    //console.log(allposts);
    res.render("profile", { user, allposts });
  } catch (error) {
    //console.error("Error fetching posts:", error);
    res.status(500).send("Error fetching profile data");
  }
});

app.get("/like/:id", isloggedin, async (req, res) => {
  let post = await postmodel.findOne({ _id: req.params.id }).populate("user");
  //console.log(user);
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();
  res.redirect("/profile");
});

app.get("/edit/:id", isloggedin, isrealone, async (req, res) => {
  let post = await postmodel.findOne({ _id: req.params.id }).populate("user");
  res.render("edit", { post });
});

app.get("/delete/:id", isloggedin, isrealone, async (req, res) => {
  let user = await usermodel.findOne({ posts: { $in: [req.params.id] } });
  user.posts.splice(user.posts.indexOf(req.params.id), 1);
  await postmodel.deleteOne({ _id: req.params.id });
  res.redirect("/profile");
});

app.post("/update/:id", isloggedin, async (req, res) => {
  let post = await postmodel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );
  res.redirect("/profile");
});

app.post("/post", isloggedin, async (req, res) => {
  let user = await usermodel.findOne({ email: req.user.email });
  let { content } = req.body;
  let post = await postmodel.create({
    user: user._id,
    content,
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

app.post("/register", async (req, res) => {
  let { name, username, email, password } = req.body;

  let user = await usermodel.findOne({ email });
  if (user) return res.status(500).send("User Already Registered");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await usermodel.create({
        username,
        name,
        email,
        password: hash,
      });

      let token = jwt.sign({ email: email, userid: user._id }, "shshshhhh");
      res.cookie("token", token);
      res.redirect("/profile");
    });
  });
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  let user = await usermodel.findOne({ email });
  if (!user) return res.status(500).send("Something Went Wrong");

  bcrypt.compare(password, user.password, (error, result) => {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "shshshhhh");
      res.cookie("token", token);
      res.redirect("/profile");
    } else res.redirect("/login");
  });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

app.listen(process.env.PORT || 3000);

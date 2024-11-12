const mongoose = require("mongoose");

mongoose
  .connect("mongodb+srv://ayyumishra2412:Ayyumishra%402412@cluster0.m6d0u.mongodb.net/kitabApp?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("Error connecting to MongoDB:", err));

const userschema = mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
    },
  ],
  profile: {
    data: Buffer,
    contentType: String,
  },
});

module.exports = mongoose.model("user", userschema);

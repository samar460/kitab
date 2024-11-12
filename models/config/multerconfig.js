const multer = require("multer");

// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = upload;

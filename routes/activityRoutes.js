const router = require("express").Router();
const auth   = require("../middleware/authMiddleware");
const { getBoardActivity } = require("../controllers/ActivityController");

router.get("/:boardId", auth, getBoardActivity);

module.exports = router;
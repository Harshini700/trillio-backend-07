const router = require("express").Router();
const auth   = require("../middleware/authMiddleware");
const { getBoardActivity } = require("../controllers/activityController");

router.get("/:boardId", auth, getBoardActivity);

module.exports = router;
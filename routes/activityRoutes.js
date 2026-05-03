const router = require("express").Router();
const auth   = require("../middleware/authMiddleware");
const { getBoardActivity } = require("../controllers/Activitycontroller");

router.get("/:boardId", auth, getBoardActivity);

module.exports = router;
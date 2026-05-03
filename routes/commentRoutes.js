const router = require("express").Router();
const auth   = require("../middleware/authMiddleware");
const { addComment, getComments, deleteComment } = require("../controllers/commentController");

router.post("/",                  auth, addComment);
router.get("/:cardId",            auth, getComments);
router.delete("/:commentId",      auth, deleteComment);

module.exports = router;
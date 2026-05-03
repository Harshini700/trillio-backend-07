const router = require("express").Router();
const auth   = require("../middleware/authMiddleware");
const {
  createBoard,
  getBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember,
} = require("../controllers/boardController");

router.post("/",                            auth, createBoard);
router.get("/",                             auth, getBoards);
router.get("/:boardId",                     auth, getBoard);
router.put("/:boardId",                     auth, updateBoard);
router.delete("/:boardId",                  auth, deleteBoard);
router.post("/:boardId/members",            auth, addMember);
router.delete("/:boardId/members/:userId",  auth, removeMember);

module.exports = router;
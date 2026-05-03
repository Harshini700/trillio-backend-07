const router       = require("express").Router();
const auth         = require("../middleware/authMiddleware");
const { upload }   = require("../config/cloudinary");
const {
  createCard,
  getCards,
  updateCard,
  deleteCard,
  uploadAttachment,
  deleteAttachment,
  reorderCards,
} = require("../controllers/cardController");

router.post("/",                                        auth, createCard);
router.get("/:boardId",                                 auth, getCards);
router.put("/reorder",                                  auth, reorderCards);
router.put("/:cardId",                                  auth, updateCard);
router.delete("/:cardId",                               auth, deleteCard);
router.post("/:cardId/upload",    auth, upload.single("file"), uploadAttachment);
router.delete("/:cardId/attachments/:attachmentId",     auth, deleteAttachment);

module.exports = router;
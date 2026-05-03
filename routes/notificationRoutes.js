const router = require("express").Router();
const auth   = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/Notificationcontroller");

router.get("/",                  auth, getNotifications);
router.put("/read-all",          auth, markAllAsRead);
router.put("/:id/read",          auth, markAsRead);
router.delete("/:id",            auth, deleteNotification);

module.exports = router;
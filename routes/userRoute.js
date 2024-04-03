const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const moment = require("moment");

const User = require("../models/UserModel");
const Doctor = require("../models/doctorModel");
const Appointment = require("../models/appointmentModel");
const authMiddleware = require("../middlewares/authMiddleware");
 
router.post("/register", async (req, res) => {
  try {
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) {
      return res
        .status(200)
        .send({ message: "User already exists", success: false });
    }

    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    req.body.password = hashedPassword;
    const newUser = new User(req.body);
    await newUser.save();

    res
      .status(200)
      .send({ message: "User created sucessfully", success: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: "Error creating user", success: false, error });
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(200)
        .send({ message: "User does not exist", success: false });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res
        .status(200)
        .send({ message: "password is incorrect", success: false });
    } else {
      // generate a token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      res
        .status(200)
        .send({ message: "Login successful", success: true, data: token });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Error loggin in", success: false, error });
  }
});

router.post("/get-user-info-by-id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId });
    user.password = undefined;
    if (!user) {
      return res
        .status(200)
        .send({ message: "User does not exist", success: false });
    } else {
      return res.status(200).send({
        success: true,
        data: user,
      });
    }
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Error getting user info", success: false, error });
  }
});

router.post("/apply-doctor-account", authMiddleware, async (req, res) => {
  try {
    const newDoctor = new Doctor({ ...req.body, status: "pending" });
    await newDoctor.save();
    const adminUser = await User.findOne({ isAdmin: true });

    const unseenNotifications = adminUser.unseenNotifications;
    unseenNotifications.push({
      type: "new-doctor-request",
      message: `${newDoctor.firstName} ${newDoctor.lastName} has applied for a doctor account`,
      data: {
        doctorId: newDoctor._id,
        name: newDoctor.firstName + " " + newDoctor.lastName,
      },
      onClickPath: "/admin/doctorslist",
    });
    await User.findByIdAndUpdate(adminUser, { unseenNotifications });
    res.status(200).send({
      message: "Applied for doctor account successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error applying for doctor account",
      success: false,
      error,
    });
  }
});

router.post("/mark-all-notifications-as-seen",authMiddleware, async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.body.userId });
      const unseenNotifications = user.unseenNotifications;
      const seenNotifications = user.seenNotifications;
      seenNotifications.push(...unseenNotifications);
      user.unseenNotifications = [];
      user.seenNotifications = seenNotifications;

      const updatedUser = await user.save();
      updatedUser.password = undefined;
      res.status(200).send({
        message: "Marked all notifications as seen",
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Error marking all notifications as seen",
        success: false,
        error,
      });
    }
  }
);

router.post("/delete-all-notifications", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId });
    user.seenNotifications = [];
    user.unseenNotifications = [];
    const updatedUser = await user.save();
    updatedUser.password = undefined;
    res.status(200).send({
      message: "Delete all notifications",
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error deleting all notifications",
      success: false,
      error,
    });
  }
});

router.get("/get-all-approved-doctors", authMiddleware, async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: "approved" });
    res.status(200).send({
      message: "Doctors fetch successfully",
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: "Error fetching doctor", success: false, error });
  }
});

router.post("/book-appointment", authMiddleware, async (req, res) => {
  try {
    const { date, time, doctorInfo, userInfo } = req.body;

    const newAppointment = new Appointment({
      ...req.body,
      status: "pending",
      date: moment(date, "DD-MM-YYYY").toISOString(),
      time: moment(time, "HH:mm").toISOString()
    });

    await newAppointment.save();

    // Push notification to doctor
    const user = await User.findById(doctorInfo.userId);
    user.unseenNotifications.push({
      type: "new-appointment",
      message: `You have a new appointment request from ${userInfo.name}`,
      onClickPath: "/doctor/appointments",
    });
    await user.save();

    res.status(200).send({
      message: "Appointment booked successfully",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error booking appointment", success: false, error });
  }
});

router.post("/check-booking-availability", authMiddleware, async (req, res) => {
  try {
    const { date, time, doctorId } = req.body;

    const fromTime = moment(time, "HH:mm").subtract(29, "minutes").toISOString();
    const toTime = moment(time, "HH:mm").add(29, "minutes").toISOString();

    const appointments = await Appointment.find({
      doctorId,
      date: moment(date, "DD-MM-YYYY").toISOString(),
      time: { $gte: fromTime, $lte: toTime },
    });

    if (appointments.length > 0) {
      return res.status(200).send({
        message: "Appointment not available",
        success: false,
      });
    } else {
      return res.status(200).send({
        message: "Appointment available",
        success: true,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error checking appointment availability", success: false, error });
  }
});

router.get("/get-appointments-by-user-id", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.body.userId });
    res.status(200).send({
      message: "Appointments fetch successfully",
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: "Error fetching appointments ", success: false, error });
  }
});


module.exports = router;


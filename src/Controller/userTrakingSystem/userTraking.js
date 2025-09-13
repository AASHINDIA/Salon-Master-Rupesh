import User from '../../Modal/Users/User.js'
import Candidate from '../../Modal/Candidate/Candidate.js'
import Compony from '../../Modal/Compony/ComponyModal.js'
import Salon from '../../Modal/Salon/Salon.js'


export const getAllUsers = async (req, res) => {
  try {
    // pagination params
    const { page = 1, limit = 10, search = "" } = req.query;

    // search filter
    const searchFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } }, // case-insensitive
            { whatsapp_number: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // fetch users with pagination
    const users = await User.find(searchFilter)
      .select(
        "-password -access_token -refresh_token -devicetoken -otp_sent_at -otp_attempts -otp_expires_at"
      ) // exclude sensitive fields
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // total users count
    const totalUsers = await User.countDocuments(searchFilter);

    res.status(200).json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};




export const getUserProfileById = async (req, res) => {
  try {
    const { userId } = req.params;

    // get base user (hide sensitive fields)
    const user = await User.findById(userId).select(
      "-password -access_token -refresh_token -devicetoken -otp_sent_at -otp_attempts -otp_expires_at"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let profile = null;

    if (user.domain_type === "worker") {
      profile = await Candidate.findOne({ user_id: user._id });
    } else if (user.domain_type === "company") {
      profile = await Compony.findOne({ user_id: user._id });
    } else if (user.domain_type === "salon") {
      profile = await Salon.findOne({ user_id: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      profile,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message,
    });
  }
};
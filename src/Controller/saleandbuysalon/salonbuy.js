import User from "../../Modal/Users/User.js";
import CommonSeller from "../../Modal/sales/commonseller.js";
import Candidate from "../../Modal/Candidate/Candidate.js";
import Company from "../../Modal/Compony/ComponyModal.js";
import Salon from "../../Modal/Salon/Salon.js";
import traininginstitute from "../../Modal/traininginstitute/training_institute.js";
import franchise from "../../Modal/franchise/franchise.js";
import SellerListing from "../../Modal/sales/SellerListing.js";
import { uploadToCloudinary } from "../../Utils/imageUpload.js";


export const getDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let details;
        let formattedDetails = {};

        switch (user.domain_type) {
            case 'salon':
                details = await Salon.findOne({ user_id: userId });
                if (details) {
                    formattedDetails = {
                        full_name: details.salon_name || details.brand_name,
                        email: user.email, // Assuming email is in User model
                        phone_number: details.contact_number || details.whatsapp_number,
                        id_details: {
                            pan_number: details.pan_number,
                            gst_number: details.gst_number
                        }
                    };
                }
                break;
            case 'worker':
                details = await Candidate.findOne({ user_id: userId });
                if (details) {
                    formattedDetails = {
                        full_name: details.name,
                        email: user.email, // Assuming email is in User model
                        phone_number: details.contact_no,
                        id_details: {
                            id_type: details.id_type,
                            id_number: details.id_detail?.number,
                            pan_number: details.pan_no
                        }
                    };
                }
                break;
            case 'company':
                details = await Company.findOne({ user_id: userId });
                if (details) {
                    formattedDetails = {
                        full_name: details.company_name || details.brand,
                        email: user.email, // Assuming email is in User model
                        phone_number: details.whatsapp_number,
                        id_details: {
                            pan_number: details.pan_number,
                            gst_number: details.gst_number,
                            cin: details.cin
                        }
                    };
                }
                break;
            case 'sales':
                details = await CommonSeller.findOne({ userId });
                if (details) {
                    formattedDetails = {
                        full_name: details.fullName,
                        email: details.email,
                        phone_number: details.phoneNumber,
                        id_details: {
                            pan_number: details.panNumber
                        }
                    };
                }
                break;
            case 'Training':
                details = await traininginstitute.findOne({ userId });
                if (details) {
                    formattedDetails = {
                        full_name: details.fullName,
                        email: details.email,
                        phone_number: details.phoneNumber,
                        id_details: {
                            pan_number: details.panNumber
                        }
                    };
                }
                break;
            case 'Franchise':
                details = await franchise.findOne({ userId });
                if (details) {
                    formattedDetails = {
                        full_name: details.fullName,
                        email: details.email,
                        phone_number: details.phoneNumber,
                        id_details: {
                            pan_number: details.panNumber
                        }
                    };
                }
                break;
            default:
                return res.status(400).json({ success: false, message: "Invalid domain type" });
        }

        if (!details) {
            return res.status(404).json({ success: false, message: "Details not found for this user" });
        }

        res.status(200).json({
            success: true,
            data: formattedDetails,
            domain_type: user.domain_type
        });
    } catch (error) {
        console.error("Error fetching details:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



// ✅ Admin or system-controlled update for sub_domain_type
export const updateSubDomainType = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sub_domain_type } = req.body;

        if (!["buyer", "seller"].includes(sub_domain_type)) {
            return res.status(400).json({ message: "Invalid sub-domain type" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.domain_type !== "sales") {
            return res.status(400).json({ message: "Sub-domain only applies to sales users" });
        }

        if (user.sub_domain_type === sub_domain_type) {
            return res.status(200).json({ message: "Sub-domain type is already set", data: user });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { sub_domain_type } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Sub-domain type updated successfully",
            data: {
                id: updatedUser._id,
                email: updatedUser.email,
                sub_domain_type: updatedUser.sub_domain_type
            },
        });
    } catch (error) {
        console.error("Error updating sub-domain:", error);
        res.status(500).json({ message: "Server error" });
    }
};



export const createOrUpdateCommonSeller = async (req, res) => {
    try {
        const userId = req.user.id; // ✅ fixed: req.use.id → req.user.id (assuming JWT middleware)
        const { fullName, phoneNumber, email, panNumber } = req.body;

        // Validate required fields
        if (!userId || !fullName || !phoneNumber || !email || !panNumber) {
            return res.status(400).json({
                success: false,
                message:
                    "All required fields (userId, fullName, phoneNumber, email, panNumber) must be provided",
            });
        }

        let profileImageUrl = null;

        // ✅ Handle image upload if file is provided
        if (req.file) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, "sellers");
                profileImageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary upload error:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Image upload failed",
                    error: uploadError.message,
                });
            }
        }

        // ✅ Check if seller already exists
        let seller = await CommonSeller.findOne({ userId });

        if (seller) {
            // Update existing seller
            seller.fullName = fullName || seller.fullName;
            seller.phoneNumber = phoneNumber || seller.phoneNumber;
            seller.email = email || seller.email;
            seller.panNumber = panNumber || seller.panNumber;

            // only update image if new one provided
            if (profileImageUrl) seller.profileImage = profileImageUrl;

            await seller.save();

            return res.status(200).json({
                success: true,
                message: "Seller profile updated successfully",
                data: seller,
            });
        } else {
            // Create new seller
            const newSeller = new CommonSeller({
                userId,
                fullName,
                phoneNumber,
                email,
                panNumber,
                profileImage: profileImageUrl,
            });

            await newSeller.save();

            return res.status(201).json({
                success: true,
                message: "Seller profile created successfully",
                data: newSeller,
            });
        }
    } catch (error) {
        console.error("Error in createOrUpdateCommonSeller:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};


export const getCommonSellerProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required to fetch profile",
            });
        }

        const seller = await CommonSeller.findOne({ userId }).populate("userId", "name email");

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller profile not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Seller profile fetched successfully",
            data: seller,
        });
    } catch (error) {
        console.error("Error fetching seller profile:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};


export const createSellerListing = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            fullName,
            idDetails,
            phoneNumber,
            email,
            shopName,
            status,
            heading,
            description,
            short_description,
            address,
            advertisementDetails,
            termsAccepted,
        } = req.body;

        // Validate required fields
        if (!fullName || !idDetails || !phoneNumber || !email || !shopName || !status || !heading || !termsAccepted) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing or terms not accepted",
            });
        }

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({ success: false, message: "status must be 'active' or 'inactive'" });
        }



        // Upload advertisement images if provided
        let advertisementImages = [];
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const uploadResult = await uploadToCloudinary(file.buffer, "seller-listings");
                advertisementImages.push(uploadResult.secure_url);
            }
        }

        // Create new listing
        const newListing = new SellerListing({
            userId,
            fullName,
            idDetails,
            phoneNumber,
            email,
            shopName,
            status,
            heading,
            description,
            short_description,
            address,
            advertisementDetails,
            advertisementImages,
            termsAccepted,
        });

        await newListing.save();

        return res.status(201).json({
            success: true,
            message: "Seller listing created successfully",
            data: newListing,
        });
    } catch (error) {
        console.error("Error in createSellerListing:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};




/**
 * @desc Get all seller listings for the logged-in user
 * @route GET /api/seller-listing/my-listings
 * @access Private
 */

export const getSellerListingsByUser = async (req, res) => {
    try {
        const userId = req.user.id; // from JWT auth
        const { search = "", fromDate, toDate, page = 1, limit = 10, sort = "latest" } = req.query;

        // Step 1: Find Common Seller by userId
        const commonSeller = await CommonSeller.findOne({ userId });
        if (!commonSeller) {
            return res.status(404).json({
                success: false,
                message: "Seller profile not found",
            });
        }

        // Step 2: Build filter object
        const filter = { userId: commonSeller.userId };

        // Add Date filter (from / to)
        if (fromDate && toDate) {
            filter.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        } else if (fromDate) {
            filter.createdAt = { $gte: new Date(fromDate) };
        } else if (toDate) {
            filter.createdAt = { $lte: new Date(toDate) };
        }

        // Add Search filter (adjust fields based on your schema)
        if (search.trim()) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        // Step 3: Pagination setup
        const skip = (Number(page) - 1) * Number(limit);

        // Step 4: Sorting setup
        const sortOrder = sort === "old" ? 1 : -1; // "latest" = descending, "old" = ascending

        // Step 5: Fetch filtered data
        const listings = await SellerListing.find(filter)
            .sort({ createdAt: sortOrder })
            .skip(skip)
            .limit(Number(limit));

      
        // Step 6: Count total for pagination 
        const total = await SellerListing.countDocuments(filter);

        // Step 7: Send response
        return res.status(200).json({
            success: true,
            count: listings.length,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: listings,
        });
    } catch (error) {
        console.error("Error fetching seller listings:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

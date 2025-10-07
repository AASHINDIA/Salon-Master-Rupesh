import TraningList from "../../Modal/traininginstitute/TraningList.js";
import FranchiseList from "../../Modal/franchise/FranchiseList.js";
import traininginstitute from "../../Modal/traininginstitute/training_institute.js";
import franchise from "../../Modal/franchise/franchise.js";
import { uploadToCloudinary } from "../../Utils/imageUpload.js";

export const createTraningList = async (req, res) => {
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
        if (!fullName || !idDetails || !phoneNumber || !email || !shopName || !status || !heading || termsAccepted !== true) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing or terms not accepted",
            });
        }

        if (!["active", "inactive"].includes(heading)) {
            return res.status(400).json({ success: false, message: "Heading must be 'active' or 'inactive'" });
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
        const newListing = new TraningList({
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

export const createFranchiseList = async (req, res) => {
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
        if (!fullName || !idDetails || !phoneNumber || !email || !shopName || !status || !heading || termsAccepted !== true) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing or terms not accepted",
            });
        }

        if (!["active", "inactive"].includes(heading)) {
            return res.status(400).json({ success: false, message: "Heading must be 'active' or 'inactive'" });
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
        const newListing = new FranchiseList({
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



export const createOrUpdatetraininginstitute = async (req, res) => {
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
        let seller = await traininginstitute.findOne({ userId });

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
            const newSeller = new traininginstitute({
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


export const createOrUpdatefranchise = async (req, res) => {
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
        let seller = await franchise.findOne({ userId });

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
            const newSeller = new franchise({
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




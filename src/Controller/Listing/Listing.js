import TraningList from "../../Modal/traininginstitute/TraningList.js";
import FranchiseList from "../../Modal/franchise/FranchiseList.js";
import SellerListing from "../../Modal/sales/SellerListing.js";

// controllers/franchiseController.js
import mongoose from "mongoose";

import traininginstitute from "../../Modal/traininginstitute/training_institute.js";
import franchise from "../../Modal/franchise/franchise.js";
import { uploadToCloudinary } from "../../Utils/imageUpload.js";
import ListingInterestSchema from "../../Modal/InterstedSchema/ListingInterestSchema.js";

// creating Listing For
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


// creating and Updating Profile of Listers

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


// get profile of the listers

export const gettraininginstituteProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required to fetch profile",
            });
        }

        const seller = await traininginstitute.findOne({ userId }).populate("userId", "name email");

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

export const getfranchiseProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required to fetch profile",
            });
        }

        const seller = await franchise.findOne({ userId }).populate("userId", "name email");

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





// get The Priclur User Listing


// Utility function for filtering, search, pagination, and sorting
const getFilteredListings = async (Model, userId, SellerModel, req, res) => {
    try {
        const { search = "", fromDate, toDate, page = 1, limit = 10, sort = "latest" } = req.query;

        // Find seller by user ID
        const commonSeller = await SellerModel.findOne({ userId });
   
        if (!commonSeller) {
            return res.status(404).json({
                success: false,
                message: "Seller profile not found",
            });
        }

        // Base filter
        const filter = { userId: commonSeller.userId };
        
        
        // Date filter (from–to)
        if (fromDate && toDate) {
            filter.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        } else if (fromDate) {
            filter.createdAt = { $gte: new Date(fromDate) };
        } else if (toDate) {
            filter.createdAt = { $lte: new Date(toDate) };
        }
       
        
        // Search filter (optional: modify fields like title, description, etc.)
        if (search.trim()) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        // Pagination setup
        const skip = (Number(page) - 1) * Number(limit);

        // Sorting
        const sortOrder = sort === "old" ? 1 : -1; // latest = descending

        // Fetch data
        const listings = await Model.find(filter)
            .sort({ createdAt: sortOrder })
            .skip(skip)
            .limit(Number(limit));

            console.log("listings",listings);
        // Count total for pagination
        const total = await Model.countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: listings.length,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: listings,
        });
    } catch (error) {
        console.error("Error fetching listings:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// Training institute listings
export const gettraininginstituteListingsByUser = async (req, res) => {
    const userId = req.user.id;
    await getFilteredListings(TraningList, userId, traininginstitute, req, res);
};

// Franchise listings
export const getfranchiseListingsByUser = async (req, res) => {
    const userId = req.user.id;
    await getFilteredListings(FranchiseList, userId, franchise, req, res);
};




export const getPublicFranchiseListings = async (Model, req, res) => {
  try {
    const {
      search = "",
      fromDate,
      toDate,
      city,
      state,
      page = 1,
      limit = 10,
      sort = "latest",
    } = req.query;

    const now = new Date();
    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = sort === "old" ? 1 : -1;

    // 🔹 Build match conditions
    const matchStage = {
      status: "active",
      expiredAt: { $gte: now },
    };

    // 🔹 Search filters
    if (search.trim()) {
      matchStage.$or = [
        { heading: { $regex: search, $options: "i" } },
        { shopName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { short_description: { $regex: search, $options: "i" } },
        { advertisementDetails: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    // 🔹 Date filters
    if (fromDate && toDate) {
      matchStage.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    } else if (fromDate) {
      matchStage.createdAt = { $gte: new Date(fromDate) };
    } else if (toDate) {
      matchStage.createdAt = { $lte: new Date(toDate) };
    }

    // 🔹 City/state filters
    if (city) matchStage.address = { $regex: city, $options: "i" };
    if (state) matchStage.address = { $regex: state, $options: "i" };

    // 🔹 Aggregation pipeline (efficient pagination + total count)
    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: sortOrder } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: Number(limit) }],
        },
      },
      { $addFields: { total: { $arrayElemAt: ["$metadata.total", 0] } } },
    ];

    const result = await Model.aggregate(pipeline);
    const listings = result[0]?.data || [];
    const total = result[0]?.total || 0;

    let listingsWithInterest = listings;

    // 🔹 If user logged in → join with interest data
    if (req.user?.id) {
      const userId = new mongoose.Types.ObjectId(req.user.id);
      const listingType = Model.modelName;

      const interestData = await ListingInterestSchema.aggregate([
        {
          $match: {
            userId,
            listingType,
            listingId: { $in: listings.map((l) => l._id) },
          },
        },
        { $project: { listingId: 1, status: 1 } },
      ]);

      const interestMap = new Map(
        interestData.map((i) => [i.listingId.toString(), i.status])
      );

      listingsWithInterest = listings.map((l) => ({
        ...l,
        isUserInterested: interestMap.get(l._id.toString()) === "interested",
      }));
    } else {
      // 🔹 Guest user (not logged in)
      listingsWithInterest = listings.map((l) => ({
        ...l,
        isUserInterested: false,
      }));
    }

    // ✅ Final Response
    return res.status(200).json({
      success: true,
      total,
      count: listingsWithInterest.length,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      filtersApplied: matchStage,
      data: listingsWithInterest,
    });
  } catch (error) {
    console.error("Error fetching franchise listings:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching listings",
      error: error.message,
    });
  }
};



// For franchise listings
export const getFranchiseListings = (req, res) => {
    return getPublicFranchiseListings(FranchiseList, req, res);
};

// For brand listings
export const getTraningListListings = (req, res) => {
    return getPublicFranchiseListings(TraningList, req, res);
};

// For dealer listings
export const getSellerListing = (req, res) => {
    return getPublicFranchiseListings(SellerListing, req, res);
};


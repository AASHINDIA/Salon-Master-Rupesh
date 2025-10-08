import FranchiseList from "../../Modal/franchise/FranchiseList.js";
import TraningList from "../../Modal/traininginstitute/TraningList.js";
import SellerListing from "../../Modal/sales/SellerListing.js";
import { uploadToCloudinary } from "../../Utils/imageUpload.js";
import { Parser } from 'json2csv';

// FranchiseList Controllers
export const getAllFranchiseLists = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, fromDate, toDate, export: exportOption } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { shopName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
            ];
        }

        if (fromDate) {
            query.createdAt = { ...query.createdAt, $gte: new Date(fromDate) };
        }

        if (toDate) {
            query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };
        }

        const listings = await FranchiseList.find(query).sort({ createdAt: -1 });

        if (exportOption === 'true') {
            const fields = [
                'userId', 'fullName', 'idDetails', 'phoneNumber', 'email', 'shopName',
                'status', 'heading', 'description', 'short_description', 'address',
                'advertisementDetails', 'advertisementImages', 'termsAccepted',
                'createdAt', 'updatedAt', 'expiredAt'
            ];
            const opts = {
                fields,
                transforms: [
                    (item) => ({
                        ...item,
                        advertisementImages: item.advertisementImages.join(';'),
                        userId: item.userId?.toString(),
                        createdAt: item.createdAt?.toISOString(),
                        updatedAt: item.updatedAt?.toISOString(),
                        expiredAt: item.expiredAt?.toISOString(),
                    })
                ]
            };
            const parser = new Parser(opts);
            const csv = parser.parse(listings);

            res.set('Content-Type', 'text/csv');
            res.set('Content-Disposition', 'attachment; filename="franchise_listings.csv"');
            return res.send(csv);
        }

        const paginatedListings = listings.slice((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit));
        const total = listings.length;

        return res.status(200).json({
            success: true,
            data: paginatedListings,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error("Error in getAllFranchiseLists:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const updateFranchiseList = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        let advertisementImages = [];

        const listing = await FranchiseList.findById(id);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Franchise listing not found",
            });
        }

        if (updateData.heading && !["active", "inactive"].includes(updateData.heading)) {
            return res.status(400).json({ success: false, message: "Heading must be 'active' or 'inactive'" });
        }

        if (updateData.imagesToRemove && Array.isArray(updateData.imagesToRemove)) {
            advertisementImages = listing.advertisementImages.filter(
                img => !updateData.imagesToRemove.includes(img)
            );
            delete updateData.imagesToRemove;
        } else {
            advertisementImages = listing.advertisementImages || [];
        }

        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const uploadResult = await uploadToCloudinary(file.buffer, "franchise-listings");
                advertisementImages.push(uploadResult.secure_url);
            }
        }

        if (advertisementImages.length > 5) {
            return res.status(400).json({ success: false, message: "You can have a maximum of 5 images" });
        }

        updateData.advertisementImages = advertisementImages;

        const updatedListing = await FranchiseList.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        return res.status(200).json({
            success: true,
            message: "Franchise listing updated successfully",
            data: updatedListing,
        });
    } catch (error) {
        console.error("Error in updateFranchiseList:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const deleteFranchiseList = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedListing = await FranchiseList.findByIdAndDelete(id);

        if (!deletedListing) {
            return res.status(404).json({
                success: false,
                message: "Franchise listing not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Franchise listing deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteFranchiseList:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const toggleFranchiseListStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await FranchiseList.findById(id);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Franchise listing not found",
            });
        }

        listing.status = listing.status === "active" ? "inactive" : "active";
        await listing.save();

        return res.status(200).json({
            success: true,
            message: "Franchise listing status toggled successfully",
            data: listing,
        });
    } catch (error) {
        console.error("Error in toggleFranchiseListStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// TraningList Controllers
export const getAllTraningLists = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, fromDate, toDate, export: exportOption } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { shopName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
            ];
        }

        if (fromDate) {
            query.createdAt = { ...query.createdAt, $gte: new Date(fromDate) };
        }

        if (toDate) {
            query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };
        }

        const listings = await TraningList.find(query).sort({ createdAt: -1 });

        if (exportOption === 'true') {
            const fields = [
                'userId', 'fullName', 'idDetails', 'phoneNumber', 'email', 'shopName',
                'status', 'heading', 'description', 'short_description', 'address',
                'advertisementDetails', 'advertisementImages', 'termsAccepted',
                'createdAt', 'updatedAt', 'expiredAt'
            ];
            const opts = {
                fields,
                transforms: [
                    (item) => ({
                        ...item,
                        advertisementImages: item.advertisementImages.join(';'),
                        userId: item.userId?.toString(),
                        createdAt: item.createdAt?.toISOString(),
                        updatedAt: item.updatedAt?.toISOString(),
                        expiredAt: item.expiredAt?.toISOString(),
                    })
                ]
            };
            const parser = new Parser(opts);
            const csv = parser.parse(listings);

            res.set('Content-Type', 'text/csv');
            res.set('Content-Disposition', 'attachment; filename="traning_listings.csv"');
            return res.send(csv);
        }

        const paginatedListings = listings.slice((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit));
        const total = listings.length;

        return res.status(200).json({
            success: true,
            data: paginatedListings,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error("Error in getAllTraningLists:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const updateTraningList = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        let advertisementImages = [];

        const listing = await TraningList.findById(id);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Traning listing not found",
            });
        }

        if (updateData.heading && !["active", "inactive"].includes(updateData.heading)) {
            return res.status(400).json({ success: false, message: "Heading must be 'active' or 'inactive'" });
        }

        if (updateData.imagesToRemove && Array.isArray(updateData.imagesToRemove)) {
            advertisementImages = listing.advertisementImages.filter(
                img => !updateData.imagesToRemove.includes(img)
            );
            delete updateData.imagesToRemove;
        } else {
            advertisementImages = listing.advertisementImages || [];
        }

        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const uploadResult = await uploadToCloudinary(file.buffer, "traning-listings");
                advertisementImages.push(uploadResult.secure_url);
            }
        }

        if (advertisementImages.length > 5) {
            return res.status(400).json({ success: false, message: "You can have a maximum of 5 images" });
        }

        updateData.advertisementImages = advertisementImages;

        const updatedListing = await TraningList.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        return res.status(200).json({
            success: true,
            message: "Traning listing updated successfully",
            data: updatedListing,
        });
    } catch (error) {
        console.error("Error in updateTraningList:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const deleteTraningList = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedListing = await TraningList.findByIdAndDelete(id);

        if (!deletedListing) {
            return res.status(404).json({
                success: false,
                message: "Traning listing not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Traning listing deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteTraningList:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const toggleTraningListStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await TraningList.findById(id);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Traning listing not found",
            });
        }

        listing.status = listing.status === "active" ? "inactive" : "active";
        await listing.save();

        return res.status(200).json({
            success: true,
            message: "Traning listing status toggled successfully",
            data: listing,
        });
    } catch (error) {
        console.error("Error in toggleTraningListStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// SellerListing Controllers
export const getAllSellerListings = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, fromDate, toDate, export: exportOption } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { shopName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
            ];
        }

        if (fromDate) {
            query.createdAt = { ...query.createdAt, $gte: new Date(fromDate) };
        }

        if (toDate) {
            query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };
        }

        const listings = await SellerListing.find(query).sort({ createdAt: -1 });

        if (exportOption === 'true') {
            const fields = [
                'userId', 'fullName', 'idDetails', 'phoneNumber', 'email', 'shopName',
                'status', 'heading', 'description', 'short_description', 'address',
                'advertisementDetails', 'advertisementImages', 'termsAccepted',
                'createdAt', 'updatedAt', 'expiredAt'
            ];
            const opts = {
                fields,
                transforms: [
                    (item) => ({
                        ...item,
                        advertisementImages: item.advertisementImages.join(';'),
                        userId: item.userId?.toString(),
                        createdAt: item.createdAt?.toISOString(),
                        updatedAt: item.updatedAt?.toISOString(),
                        expiredAt: item.expiredAt?.toISOString(),
                    })
                ]
            };
            const parser = new Parser(opts);
            const csv = parser.parse(listings);

            res.set('Content-Type', 'text/csv');
            res.set('Content-Disposition', 'attachment; filename="seller_listings.csv"');
            return res.send(csv);
        }

        const paginatedListings = listings.slice((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit));
        const total = listings.length;

        return res.status(200).json({
            success: true,
            data: paginatedListings,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error("Error in getAllSellerListings:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const updateSellerListing = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        let advertisementImages = [];

        const listing = await SellerListing.findById(id);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Seller listing not found",
            });
        }

        if (updateData.heading && !["active", "inactive"].includes(updateData.heading)) {
            return res.status(400).json({ success: false, message: "Heading must be 'active' or 'inactive'" });
        }

        if (updateData.imagesToRemove && Array.isArray(updateData.imagesToRemove)) {
            advertisementImages = listing.advertisementImages.filter(
                img => !updateData.imagesToRemove.includes(img)
            );
            delete updateData.imagesToRemove;
        } else {
            advertisementImages = listing.advertisementImages || [];
        }

        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const uploadResult = await uploadToCloudinary(file.buffer, "seller-listings");
                advertisementImages.push(uploadResult.secure_url);
            }
        }

        if (advertisementImages.length > 5) {
            return res.status(400).json({ success: false, message: "You can have a maximum of 5 images" });
        }

        updateData.advertisementImages = advertisementImages;

        const updatedListing = await SellerListing.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        return res.status(200).json({
            success: true,
            message: "Seller listing updated successfully",
            data: updatedListing,
        });
    } catch (error) {
        console.error("Error in updateSellerListing:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const deleteSellerListing = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedListing = await SellerListing.findByIdAndDelete(id);

        if (!deletedListing) {
            return res.status(404).json({
                success: false,
                message: "Seller listing not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Seller listing deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteSellerListing:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const toggleSellerListingStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await SellerListing.findById(id);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Seller listing not found",
            });
        }

        listing.status = listing.status === "active" ? "inactive" : "active";
        await listing.save();

        return res.status(200).json({
            success: true,
            message: "Seller listing status toggled successfully",
            data: listing,
        });
    } catch (error) {
        console.error("Error in toggleSellerListingStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};
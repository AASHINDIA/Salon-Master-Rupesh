import Company from '../../Modal/Compony/ComponyModal.js';
import Product from '../../Modal/Compony/Products.js';
import User from '../../Modal/Users/User.js';
// import TrendingVideo from '../../Modal/SuperAdmin/TraningVideos.js';
// __________________________________________________Candidates____________________________________

export const getProductsGroupedByUser = async (req, res) => {
  try {
    let { search } = req.query;

    // Build search filter
    const filter = {};
    if (search) {
      const regex = new RegExp(search, "i"); // case-insensitive search
      filter.$or = [
        { name: regex },
        { slug: regex },
        { description: regex },
        { shortDescription: regex },
        { tags: regex }
      ];
    }

    // Fetch products with filter
    const products = await Product.find(filter)
      .populate({ path: 'UserId', select: 'name email' })
      .populate({ path: 'category', select: 'name' });

    // Group products by user
    const grouped = {};
    products.forEach(p => {
      const userId = p.UserId?._id.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          UserId: {
            _id: p.UserId?._id,
            name: p.UserId?.name,
            email: p.UserId?.email,
            id: p.UserId?._id
          },
          products: []
        };
      }

      grouped[userId].products.push({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        category: p.category,
        tags: p.tags,
        originalPrice: p.originalPrice,
        discountPercent: p.discountPercent,
        price: p.price,
        trackQuantity: p.trackQuantity,
        quantity: p.quantity,
        images: p.images,
        status: p.status,
        rating: p.rating,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      });
    });

    res.status(200).json({
      success: true,
      count: Object.keys(grouped).length,
      data: Object.values(grouped)
    });
  } catch (error) {
    console.error('Error fetching grouped products:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};






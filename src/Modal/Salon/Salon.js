import mongoose from 'mongoose';

const salonSchema = new mongoose.Schema({
  identification_number: {
    type: String,
  },
  brand_name: {
    type: String,
  },

  isProfileCompleted: {
    type: Boolean,
    default: false,
  },
  unique_name: {
    type: String,

  },
  salon_name: {
    type: String,
  },
  year_of_start: {
    type: Number,
  },
  address: {
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    countryIsoCode: {
      type: String,
      trim: true // Store ISO code for country lookup
    },
    stateIsoCode: {
      type: String,
      trim: true // Store ISO code for state lookup
    }
  },
  contact_number: {
    type: String,
  },
  whatsapp_number: {
    type: String,
  },
  company_name: {
    type: String,
  },
  registered_address: {
    type: String,
  },
  gst_number: {
    type: String,
  },
  pan_number: {
    type: String,
  },
  instagram_link: {
    type: String,
  },
  facebook_link: {
    type: String,
  },
  youtube_link: {
    type: String,
  },
  shop_area: {
    type: Number,
    default: 0.00
  },
  female_employees_count: {
    type: Number,
    default: 0
  },
  male_employees_count: {
    type: Number,
    default: 0
  },
  managers_count: {
    type: Number,
    default: 0
  },
  payment_credit: {
    type: Number,
    default: 0.00
  },
  image_path: {
    type: String,
  },
  location: {
    type: String,
  },
  requires_employee_recruitment: {
    type: Boolean,
    default: false
  },
  requires_product_training: {
    type: Boolean,
    default: false
  },
  requires_product_order: {
    type: Boolean,
    default: false
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Virtual for total employees count
salonSchema.virtual('total_employees_count').get(function () {
  return this.female_employees_count + this.male_employees_count + this.managers_count;
});

// Indexes for better query performance
salonSchema.index({ salon_name: 1 });
salonSchema.index({ brand_name: 1 });
salonSchema.index({ user_id: 1 });

const Salon = mongoose.model('Salon', salonSchema);

export default Salon;
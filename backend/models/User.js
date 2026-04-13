const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

// Lahat ng barangay sa Marinduque — para sa validation
const BARANGAYS = {
  Boac: [
    'Agot','Agumaymayan','Amoingon','Apitong','Balagasan','Balaring',
    'Balimbing','Balogo','Bamban','Bangbangalon','Bantad','Bantay',
    'Bayuti','Binunga','Boi','Boton','Buliasnin','Bunganay','Caganhao',
    'Canat','Catubugan','Cawit','Daig','Daypay','Duyay','Hinapulan',
    'Ihatub','Isok I','Isok II Poblacion','Laylay','Lupac','Mahinhin',
    'Mainit','Malbog','Maligaya','Malusak','Mansiwat','Mataas na Bayan',
    'Maybo','Mercado','Murallon','Ogbac','Pawa','Pili','Poctoy','Poras',
    'Puting Buhangin','Puyog','Sabong','San Miguel','Santol','Sawi',
    'Tabi','Tabigue','Tagwak','Tambunan','Tampus','Tanza','Tugos',
    'Tumagabok','Tumapon'
  ],
  Buenavista: [
    'Bagacay','Bagtingon','Barangay I','Barangay II','Barangay III',
    'Barangay IV','Bicas-bicas','Caigangan','Daykitin','Libas','Malbog',
    'Sihi','Timbo','Tungib-Lipata','Yook'
  ],
  Gasan: [
    'Antipolo','Bachao Ibaba','Bachao Ilaya','Bacongbacong','Bahi',
    'Bangbang','Banot','Banuyo','Barangay I','Barangay II','Barangay III',
    'Bognuyan','Cabugao','Dawis','Dili','Libtangin','Mahunig','Mangiliol',
    'Masiga','Matandang Gasan','Pangi','Pingan','Tabionan','Tapuyan','Tiguion'
  ],
  Mogpog: [
    'Anapog-Sibucao','Argao','Balanacan','Banto','Bintakay','Bocboc',
    'Butansapa','Candahon','Capayang','Danao','Dulong Bayan','Gitnang Bayan',
    'Guisian','Hinadharan','Hinanggayon','Ino','Janagdong','Lamesa','Laon',
    'Magapua','Malayak','Malusak','Mampaitan','Mangyan-Mababad','Market Site',
    'Mataas na Bayan','Mendez','Nangka I','Nangka II','Paye','Pili',
    'Puting Buhangin','Sayao','Silangan','Sumangga','Tarug','Villa Mendez'
  ],
  'Santa Cruz': [
    'Alobo','Angas','Aturan','Bagong Silang Poblacion','Baguidbirin',
    'Baliis','Balogo','Banahaw Poblacion','Bangcuangan','Banogbog','Biga',
    'Botilao','Buyabod','Dating Bayan','Devilla','Dolores','Haguimit','Hupi',
    'Ipil','Jolo','Kaganhao','Kalangkang','Kamandugan','Kasily','Kilo-kilo',
    'Kiñaman','Labo','Lamesa','Landy','Lapu-lapu Poblacion','Libjo','Lipa',
    'Lusok','Maharlika Poblacion','Makulapnit','Maniwaya','Manlibunan',
    'Masaguisi','Masalukot','Matalaba','Mongpong','Morales','Napo',
    'Pag-asa Poblacion','Pantayin','Polo','Pulong-Parang','Punong',
    'San Antonio','San Isidro','Tagum','Tamayo','Tambangan','Tawiran','Taytay'
  ],
  Torrijos: [
    'Bangwayin','Bayakbakin','Bolo','Bonliw','Buangan','Cabuyo','Cagpo',
    'Dampulan','Kay Duke','Mabuhay','Makawayan','Malibago','Malinao',
    'Maranlig','Marlangga','Matuyatuya','Nangka','Pakaskasan','Payanas',
    'Poblacion','Poctoy','Sibuyao','Suha','Talawan','Tigwi'
  ]
}

const ALL_BARANGAYS = Object.values(BARANGAYS).flat()

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'sk_officer', 'kabataan_user'],
    default: 'kabataan_user'
  },
  municipality: {
    type: String,
    enum: {
      values: ['Boac', 'Buenavista', 'Gasan', 'Mogpog', 'Santa Cruz', 'Torrijos'],
      message: '{VALUE} is not a valid municipality in Marinduque'
    },
    required: [true, 'Municipality is required']
  },
  barangay: {
    type: String,
    trim: true,
    required: [true, 'Barangay is required'],
    validate: {
      validator: function (value) {
        return ALL_BARANGAYS.includes(value)
      },
      message: props => `"${props.value}" is not a valid barangay in Marinduque`
    }
  },
  position: {
    type: String,
    trim: true,
    default: ''
  },
  contactNumber: {
    type: String,
    trim: true,
    default: ''
  },
  photo: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    default: 0
  },

  // SK Official Application — kapag nag-apply ang user bilang SK official
  // sa registration. Naghihintay ng Admin approval bago ma-upgrade ang role.
  skApplication: {
    isApplying: {
      type: Boolean,
      default: false
    },
    appliedPosition: {
      type: String,
      default: ''
    },
    whyApply: {
      type: String,
      default: ''
    },
    proofDescription: {
      type: String,
      default: ''
    },
    appliedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    rejectReason: {
      type: String,
      default: ''
    }
  }

}, { timestamps: true })

// Hash password bago i-save
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt    = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Export BARANGAYS para magamit sa ibang files (e.g. Register.jsx dropdown)
UserSchema.statics.BARANGAYS = BARANGAYS

module.exports = mongoose.model('User', UserSchema)
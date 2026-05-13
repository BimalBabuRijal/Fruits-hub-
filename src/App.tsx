import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Apple, 
  Stethoscope, 
  ClipboardList, 
  ChevronRight, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Menu,
  Star,
  Activity,
  Heart,
  Droplets,
  Zap,
  Download,
  Search,
  Plus,
  Mail,
  Gift,
  ArrowUpRight,
  Instagram,
  MessageCircle,
  Linkedin,
  Twitter,
  Trophy,
  Check,
  Camera,
  ShoppingBag,
  Minus,
  QrCode,
  MapPin,
  Truck,
  Home,
  Phone,
  ChevronLeft,
  RefreshCcw,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef,
  InfoWindow
} from '@vis.gl/react-google-maps';

import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';

// --- Types & Data ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

interface User {
  id: string;
  name: string;
  email: string;
  points: number;
  avatar?: string;
}

interface Review {
  id: string;
  itemId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

const INITIAL_REVIEWS: Review[] = [
  { id: '1', itemId: '1', userName: 'Anil K.', rating: 5, comment: 'Best apples I have had in Kathmandu. Very crisp!', date: '2024-05-10' },
  { id: '2', itemId: '1', userName: 'Sita R.', rating: 4, comment: 'Quite fresh, arrived on time.', date: '2024-05-11' },
  { id: '3', itemId: 'checkup-basic', userName: 'Bimal T.', rating: 5, comment: 'Technician was very professional and punctual.', date: '2024-05-09' },
];

interface Fruit {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  image: string;
  type?: 'tropical' | 'berry' | 'citrus' | 'stone' | 'melon' | 'other';
}

interface CartItem extends Fruit {
  quantity: number;
}

interface FitnessPlan {
  id: string;
  name: string;
  level: string;
  description: string;
  price: number;
  features: string[];
}

interface CheckupPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  tests: string[];
}

interface Report {
  id: string;
  title: string;
  status: 'Normal' | 'Action Required';
  summary: string;
  date: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

interface Reward {
  id: string;
  title: string;
  points: number;
  image: string;
  type: 'Gift Hamper' | 'Voucher' | 'Service';
}

interface UserActivity {
  id: string;
  type: 'Purchase' | 'Redemption' | 'Review';
  title: string;
  amount: number;
  points: number;
  date: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'ringroad', name: 'Inside Ring Road (KTM/Lalitpur)', fee: 50 },
  { id: 'semi', name: 'Semi-Urban (Balaju, Tokha, Koteshwor)', fee: 100 },
  { id: 'outskirts', name: 'Outskirts (Thankot, Budhanilkantha)', fee: 200 },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'esewa', name: 'eSewa', icon: 'https://esewa.com.np/common/images/esewa_logo.png', description: 'Pay via Nepal\'s leading digital wallet.' },
  { id: 'khalti', name: 'Khalti', icon: 'https://khalti.com/static/img/logo1.png', description: 'Fast and secure digital payment.' },
  { id: 'connectips', name: 'Connect IPS', icon: 'https://www.connectips.com/images/connectips.png', description: 'Real-time bank transfers.' },
  { id: 'cod', name: 'Pay on Delivery', icon: 'https://cdn-icons-png.flaticon.com/512/6491/6491490.png', description: 'Pay once your fruits arrive.' },
];

const SERVICE_CHARGE_RATE = 0.05; // 5% service charge

const FRUITS_DATA: Fruit[] = [
  { id: '10', name: 'Papaya (Mewaa)', type: 'tropical', description: 'Buttery texture and sweet flavor, rich in digestive enzymes.', price: 110, unit: 'kg', image: 'https://images.unsplash.com/photo-1517022812141-23620dba5c23?auto=format&fit=crop&q=100&w=1600' },
  { id: '18', name: 'Avocado (Ghyu Phal)', type: 'tropical', description: 'Butter-like texture and healthy fats, locally sourced from Dhankuta.', price: 380, unit: 'kg', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=100&w=1600' },
  { id: '1', name: 'Alphonso Mango', type: 'tropical', description: 'Premium export quality, extremely sweet and fiberless.', price: 450, unit: 'kg', image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=100&w=1600' },
  { id: '2', name: 'Strawberry (Syanja)', type: 'berry', description: 'Hydropoincally grown strawberries from Syangja.', price: 250, unit: 'pack', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&q=100&w=1600' },
  { id: '3', name: 'Watermelon (Tarbuz)', type: 'melon', description: 'Juicy summer treat from the Tarai plains.', price: 65, unit: 'kg', image: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&q=100&w=1600' },
  { id: '4', name: 'Apple (Mustang)', type: 'stone', description: 'Authentic organic apples from Marpha, Mustang. Crispy and sweet.', price: 260, unit: 'kg', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6bccb?auto=format&fit=crop&q=100&w=1600' },
  { id: '5', name: 'Orange (Suntala)', type: 'citrus', description: 'Sweet seasonal oranges from Gulmi and Syangja.', price: 140, unit: 'kg', image: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?auto=format&fit=crop&q=100&w=1600' },
  { id: '6', name: 'Pomegranate (Anar)', type: 'other', description: 'Ruby-red select Grade A pomegranates.', price: 320, unit: 'kg', image: 'https://images.unsplash.com/photo-1541344999736-83eca272f6fc?auto=format&fit=crop&q=100&w=1600' },
  { id: '7', name: 'Pear (Nashpati)', type: 'stone', description: 'Crisp Asian pears from the hills of Pharping.', price: 120, unit: 'kg', image: 'https://images.unsplash.com/photo-1514756331096-242f360fe3d5?auto=format&fit=crop&q=100&w=1600' },
  { id: '8', name: 'Banana (Chini Champa)', type: 'tropical', description: 'Small, sweet, and aromatic local variety.', price: 140, unit: 'dozen', image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&q=100&w=1600' },
  { id: '9', name: 'Guava (Amba)', type: 'tropical', description: 'Soft pink guavas with deep tropical aroma.', price: 95, unit: 'kg', image: 'https://images.unsplash.com/photo-1627914437299-906f0e9b9d3e?auto=format&fit=crop&q=100&w=1600' },
  { id: '11', name: 'Litchi', type: 'berry', description: 'Seasonal delights from Eastern Nepal.', price: 180, unit: 'kg', image: 'https://images.unsplash.com/photo-1590005024862-6b6455bb529e?auto=format&fit=crop&q=100&w=1600' },
  { id: '12', name: 'Pineapple', type: 'tropical', description: 'Freshly harvested from the plains of Jhapa.', price: 120, unit: 'piece', image: 'https://images.unsplash.com/photo-1550258114-189fa29b0008?auto=format&fit=crop&q=100&w=1600' },
  { id: '13', name: 'Junar (Sindhuli)', type: 'citrus', description: 'The famous sweet citrus of the Sindhuli hills.', price: 160, unit: 'kg', image: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&q=100&w=1600' },
  { id: '14', name: 'Kiwi (Ilam)', type: 'tropical', description: 'Export quality green kiwis from Ilam.', price: 420, unit: 'kg', image: 'https://images.unsplash.com/photo-1585059895324-582fc18f900b?auto=format&fit=crop&q=100&w=1600' },
  { id: '15', name: 'Peach (Aru)', type: 'stone', description: 'Sweet summer peaches from local orchards.', price: 180, unit: 'kg', image: 'https://images.unsplash.com/photo-1550828521-4cb4440559b1?auto=format&fit=crop&q=100&w=1600' },
  { id: '16', name: 'Custard Apple', type: 'tropical', description: 'Locally grown sweet Sitafal.', price: 280, unit: 'kg', image: 'https://images.unsplash.com/photo-1647240367355-667793d5483f?auto=format&fit=crop&q=100&w=1600' },
  { id: '17', name: 'Jackfruit', type: 'tropical', description: 'Rich and meaty tropical delight.', price: 80, unit: 'kg', image: 'https://images.unsplash.com/photo-1589135084988-cb940e794356?auto=format&fit=crop&q=100&w=1600' },
  { id: '19', name: 'Dragon Fruit', type: 'tropical', description: 'Organic pink-fleshed dragon fruit.', price: 450, unit: 'kg', image: 'https://images.unsplash.com/photo-1527324688101-08d3663b6044?auto=format&fit=crop&q=100&w=1600' },
  { id: '20', name: 'Grapes (Angur)', type: 'berry', description: 'Fresh, sweet, and seedless green grapes from quality vineyards.', price: 280, unit: 'kg', image: 'https://images.unsplash.com/photo-1596364721223-3061329d81f0?auto=format&fit=crop&q=100&w=1600' },
];

const FAQ_DATA = [
  {
    question: "How do you ensure the quality of your fruits?",
    answer: "We source our fruits daily from certified organic farms and local orchards in Nepal (like apples from Mustang and oranges from Gulmi). Every piece undergoes a strict quality check for freshness, ripeness, and size before being packed in eco-friendly boxes."
  },
  {
    question: "Where do you deliver exactly?",
    answer: "Currently, we deliver across the Kathmandu Valley, including Kathmandu, Lalitpur, and Bhaktapur. We've divided areas into three zones: Inside Ring Road, Semi-Urban (like Tokha, Balaju), and Outskirts (like Budhanilkantha, Thankot) with varying delivery fees."
  },
  {
    question: "Do you offer subscription plans for fruits?",
    answer: "Yes! Our 'Fitness Plans' include a weekly fruit box delivery (ranged from 2kg to 6kg depending on the tier) along with customized diet and workout charts. It's the best way to maintain a consistent healthy lifestyle."
  },
  {
    question: "How do the health checkups work?",
    answer: "Simply book a package from the 'Checkups' section. A certified lab technician will visit your home for sample collection at your preferred time. Your reports will be digitized and available in the 'Reports' section of this app within 24-48 hours."
  },
  {
    question: "What can I do with FreshVita Reward Points?",
    answer: "You earn 1 point for every Rs. 100 spent. These points can be redeemed for various rewards in our 'Rewards' store, including free fruit baskets, full-body health vouchers, and even consultations with wellness coaches."
  },
  {
    question: "What payment methods are supported?",
    answer: "We support major digital wallets in Nepal including eSewa and Khalti, as well as Connect IPS for bank transfers. We also offer Cash on Delivery for your convenience."
  }
];

const FITNESS_PLANS: FitnessPlan[] = [
  { id: '1', name: 'Starter Wellness', level: 'Beginner', description: 'Perfect for starting your health journey.', price: 2999, features: ['Personalized diet chart', 'Basic workout plan (3d/week)', 'Weekly fruit box (2 kg)', 'Email support'] },
  { id: '2', name: 'Active Life', level: 'Intermediate', description: 'Serious about fitness and nutrition together.', price: 5499, features: ['Custom meal plan', 'Workout plan (5d/week)', 'Weekly fruit box (4 kg)', 'Nutritionist consultation (2x/month)', 'BMI Tracking'] },
  { id: '3', name: 'Elite Health', level: 'Advanced', description: 'Complete wellness transformation.', price: 9999, features: ['Full nutrition coaching', 'Daily workout plans', 'Premium fruit box (6 kg/week)', 'Weekly nutritionist calls', 'Monthly lab checkup'] },
];

const CHECKUP_PACKAGES: CheckupPackage[] = [
  { id: '1', name: 'Basic Health Check', description: 'Essential overview for quick screening.', price: 999, originalPrice: 2499, tests: ['CBC', 'Blood Sugar', 'Lipid Profile', 'Lver Function', 'Kidney Function', 'TSH', 'Urine Routine'] },
  { id: '2', name: 'Comprehensive Wellness', description: 'Full-body health assessment with doctor consulting.', price: 2999, originalPrice: 6999, tests: ['All Basic tests', 'HbA1c', 'Vitamin D & B12', 'Iron Studies', 'ECG', 'Doctor Consultation'] },
];

const REPORTS_DATA: Report[] = [
  { id: '1', title: 'Comprehensive Wellness', status: 'Action Required', summary: 'Overall health is good. Vitamin D levels slightly low — supplementation recommended.', date: 'May 10, 2026' },
  { id: '2', title: 'Basic Health Check', status: 'Normal', summary: 'All basic parameters normal. Blood pressure optimal. Liver and kidney function normal.', date: 'March 15, 2026' },
];

const REWARDS_DATA: Reward[] = [
  { id: '1', title: 'Free Fruit Basket', points: 5000, image: 'https://images.unsplash.com/photo-1543158181-e6f9f670c5b5?auto=format&fit=crop&q=90&w=1200', type: 'Gift Hamper' },
  { id: '2', title: 'Full Body Checkup', points: 10000, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=90&w=1200', type: 'Voucher' },
  { id: '3', title: 'Wellness Coach Call', points: 3500, image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=90&w=1200', type: 'Voucher' },
];

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// --- Components ---

const RouteDisplay = ({ origin, destination }: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map) return;
    
    // Clear previous route
    polylinesRef.current.forEach(p => p.setMap(null));

    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'viewport'],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => p.setMap(map));
        polylinesRef.current = newPolylines;
        if (routes[0].viewport) map.fitBounds(routes[0].viewport);
      }
    }).catch(err => console.error('Route error:', err));

    return () => polylinesRef.current.forEach(p => p.setMap(null));
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
};

const DeliveryTrackingMap = ({ customerLocation, riderLocation }: {
  customerLocation: google.maps.LatLngLiteral;
  riderLocation: google.maps.LatLngLiteral;
}) => {
  if (!hasValidKey) {
    return (
      <div className="bg-gray-100 rounded-3xl p-8 text-center flex flex-col items-center justify-center h-[300px]">
        <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
          <MapPin size={32} className="text-gray-400" />
        </div>
        <h4 className="font-black text-gray-900 mb-2">Maps API Key Required</h4>
        <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">
          To see real-time delivery tracking, please add your Google Maps API Key in <strong>Settings → Secrets</strong> as <code>GOOGLE_MAPS_PLATFORM_KEY</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full rounded-3xl overflow-hidden shadow-inner border border-gray-100 relative">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={customerLocation}
          defaultZoom={14}
          mapId="BF_DELIVERY_MAP"
          disableDefaultUI={true}
          gestureHandling={'cooperative'}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Rider Marker */}
          <AdvancedMarker position={riderLocation}>
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-green-500 rounded-full opacity-30"
              />
              <div className="relative bg-green-600 p-2 rounded-xl shadow-xl border-2 border-white">
                <Truck size={18} className="text-white" />
              </div>
            </div>
          </AdvancedMarker>

          {/* Customer Marker */}
          <AdvancedMarker position={customerLocation}>
            <div className="bg-gray-900 p-2 rounded-xl shadow-xl border-2 border-white">
              <Home size={18} className="text-white" />
            </div>
          </AdvancedMarker>

          <RouteDisplay origin={riderLocation} destination={customerLocation} />
        </Map>
      </APIProvider>
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Live Tracking</span>
      </div>
    </div>
  );
};

const AuthModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      setError(err.message);
      handleFirestoreError(err, OperationType.GET, 'auth');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 text-gray-900">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden relative z-10 shadow-2xl"
        >
          <div className="p-8 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black italic tracking-tighter">
                Welcome to FreshVita
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-600">
                Your health journey starts here
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">
                {error}
              </div>
            )}
            
            <p className="text-sm text-gray-500 leading-relaxed text-center">
              Sign in with Google to sync your points, track your health reports, and access exclusive rewards.
            </p>

            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-5 bg-gray-900 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>

            <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-[0.2em] px-4">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Navbar = ({ onOpenCart, cartCount, points, user, onSignIn, onSignOut }: { 
  onOpenCart: () => void, 
  cartCount: number, 
  points: number,
  user: User | null,
  onSignIn: () => void,
  onSignOut: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Fruits', href: '#fruits' },
    { name: 'Fitness', href: '#fitness' },
    { name: 'Checkups', href: '#checkups' },
    { name: 'Reports', href: '#reports' },
    { name: 'Rewards', href: '#rewards' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Activity', href: '#activity' },
    { name: 'Payment', href: '#payment' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-gray-100/50 py-3' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Berry Cluster Logo */}
            <div className="absolute top-0 left-1 w-4 h-4 bg-green-500 rounded-full shadow-lg" />
            <div className="absolute top-0 right-1 w-4 h-4 bg-green-600 rounded-full shadow-lg" />
            <div className="absolute bottom-1 left-3 w-4 h-4 bg-green-400 rounded-full shadow-lg" />
            <div className="absolute top-2 left-3 w-3 h-3 bg-green-300 rounded-full" />
            <div className="absolute -top-1 left-4 w-1 h-3 bg-green-800 rounded-full rotate-12" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900 font-display">
            FreshVita
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              className="text-sm font-semibold text-gray-500 hover:text-green-600 transition-colors"
            >
              {link.name}
            </a>
          ))}
          <div className="hidden lg:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
            <Trophy size={14} className="text-green-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">{points.toLocaleString()} PTS</span>
          </div>

          <button 
            onClick={onOpenCart}
            className="relative p-2 text-gray-900 hover:bg-gray-100 rounded-xl transition-all active:scale-95 group"
          >
            <ShoppingBag size={24} className="group-hover:rotate-12 transition-transform" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-3 bg-gray-50 p-1 pr-4 rounded-full border border-gray-100 group">
              <div className="relative">
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full shadow-sm" />
                {user.email === 'kopitebbr@gmail.com' && (
                  <div className="absolute -top-1 -right-1 bg-green-600 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center">
                    <Check size={6} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black tracking-tight">{user.name}</span>
                  {user.email === 'kopitebbr@gmail.com' && (
                    <span className="text-[7px] bg-green-100 text-green-700 px-1 rounded-sm font-black uppercase">Owner</span>
                  )}
                </div>
                <button onClick={onSignOut} className="text-[8px] font-black uppercase text-red-500 hover:text-red-600 transition-colors text-left">Logout</button>
              </div>
            </div>
          ) : (
            <button 
              onClick={onSignIn}
              className="bg-gray-900 text-white px-7 py-3 rounded-2xl text-sm font-bold hover:bg-green-600 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-gray-200"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button 
            onClick={onOpenCart}
            className="relative p-2 text-gray-900"
          >
            <ShoppingBag size={24} />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-green-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {cartCount}
              </span>
            )}
          </button>
          <button className="p-2 text-gray-900" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden shadow-2xl"
          >
            <div className="p-6 flex flex-col gap-6">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href}
                  className="text-xl font-bold text-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              
              {user ? (
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full shadow-md" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    onSignIn();
                  }}
                  className="bg-green-600 text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-green-100"
                >
                  Sign In
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const SectionHeading = ({ badge, title, subtitle, centered = true, id }: { badge: string, title: string, subtitle: string, centered?: boolean, id?: string }) => (
  <div className={`mb-12 ${centered ? 'text-center max-w-2xl mx-auto' : 'max-w-xl'}`} id={id}>
    <span className="inline-block px-4 py-1 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest rounded-full mb-4">
      {badge}
    </span>
    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-display tracking-tight leading-tight">
      <a href={`#${id}`} className="hover:text-green-600 transition-colors">{title}</a>
    </h2>
    <p className="text-lg text-gray-600 leading-relaxed">
      {subtitle}
    </p>
  </div>
);

const getRatingData = (itemId: string, reviews: Review[]) => {
  const itemReviews = reviews.filter(r => r.itemId === itemId);
  const avgRating = itemReviews.length > 0 
    ? itemReviews.reduce((acc, curr) => acc + curr.rating, 0) / itemReviews.length 
    : 0;
  return { avgRating, count: itemReviews.length };
};

const ReviewSubmissionModal = ({ isOpen, item, onClose, onSubmit }: { 
  isOpen: boolean, 
  item: { id: string, name: string } | null, 
  onClose: () => void, 
  onSubmit: (review: Omit<Review, 'id' | 'date'>) => void 
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState('');

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 text-gray-900">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden relative z-10 shadow-2xl"
        >
          <div className="p-8 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black italic tracking-tighter">Write a Review</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Reviewing {item.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({ itemId: item.id, userName: userName || 'Anonymous', rating, comment });
            }}
            className="p-8 space-y-6"
          >
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">How would you rate it?</label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      rating >= star ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-gray-50 text-gray-300'
                    }`}
                  >
                    <Star size={24} className={rating >= star ? 'fill-white text-white' : ''} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Your Name</label>
                <input 
                  required
                  type="text" 
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Rahul Sharma" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-green-600 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Your Feedback</label>
                <textarea 
                  required
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Tell us what you liked or how we can improve..." 
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-green-600 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-gray-900 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              Submit Review 
            </button>
            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
              Earn <span className="text-green-600">50 Points</span> for your review!
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const AnimatedFruitBg = ({ type }: { type: Fruit['type'] }) => {
  switch (type) {
    case 'tropical':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, 0],
              x: [0, 10, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-200/30 blur-3xl rounded-full"
          />
          <motion.div 
            animate={{ 
              y: [0, -40, 0],
              rotate: [0, 45, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-10 w-6 h-6 bg-green-400/30 rounded-full blur-[2px]"
          />
          <motion.div 
            animate={{ 
              y: [0, 60, 0],
              rotate: [0, -30, 0],
              scale: [1, 0.8, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-10 right-20 w-8 h-8 bg-green-600/20 rounded-full blur-[3px]"
          />
          {/* Add leaf-like floating elements */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -100],
                x: [0, (i % 2 === 0 ? 30 : -30)],
                opacity: [0, 0.3, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 15 + i * 2,
                repeat: Infinity,
                delay: i * 3
              }}
              className="absolute w-3 h-1 bg-green-200/40 rounded-full"
              style={{ bottom: '-10%', left: `${20 + i * 20}%` }}
            />
          ))}
        </div>
      );
    case 'berry':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-tr from-pink-50/20 to-purple-50/20">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 300, 
                y: Math.random() * 300,
                scale: 0,
                opacity: 0
              }}
              animate={{ 
                y: [null, -200],
                opacity: [0, 0.6, 0],
                scale: [0.5, 1.5, 0.5],
                x: [null, (Math.random() - 0.5) * 150 + 150]
              }}
              transition={{ 
                duration: 4 + Math.random() * 6, 
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "easeInOut"
              }}
              className="absolute w-2 h-2 bg-pink-400/30 rounded-full blur-[1px]"
            />
          ))}
          <motion.div 
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,182,193,0.1),transparent_70%)]"
          />
        </div>
      );
    case 'citrus':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -left-20 w-72 h-72 border-[3px] border-orange-200/20 rounded-full border-dashed"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-32 -right-32 w-60 h-60 border-[2px] border-yellow-300/15 rounded-full border-dashed"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,165,0,0.05),transparent_60%)]" />
        </div>
      );
    case 'stone':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              x: [-30, 30],
              opacity: [0.05, 0.2, 0.05]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-tr from-orange-100/15 via-transparent to-red-100/15"
          />
          {[...Array(5)].map((_, i) => (
            <motion.div 
              key={i}
              animate={{ 
                y: [0, 80],
                x: [0, (i % 2 === 0 ? 15 : -15)],
                opacity: [0, 0.5, 0],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
              className="absolute w-1.5 h-1.5 bg-orange-300/30 rounded-full blur-[1px]"
              style={{ top: '10%', left: `${15 + i * 20}%` }}
            />
          ))}
        </div>
      );
    case 'melon':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-b from-green-50/30 to-transparent"
          />
          <motion.div 
            animate={{ 
              scale: [0.5, 2],
              opacity: [0.4, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-[2px] border-green-400/20 rounded-full"
          />
           <motion.div 
            animate={{ 
              scale: [0.8, 1.5],
              opacity: [0.2, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeOut", delay: 2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-[1px] border-green-500/10 rounded-full"
          />
        </div>
      );
    default:
      return null;
  }
};

const FruitSection = ({ 
  fruits, 
  onImageUpload, 
  onReset, 
  onAddToCart,
  reviews,
  onRate,
  user,
  onEdit,
  onAdd
}: { 
  fruits: Fruit[], 
  onImageUpload: (id: string, file: File) => void, 
  onReset: () => void,
  onAddToCart: (fruit: Fruit, direct?: boolean) => void,
  reviews: Review[],
  onRate: (id: string, name: string) => void,
  user: User | null,
  onEdit: (fruit: Fruit) => void,
  onAdd: () => void
}) => {
  const isOwner = user?.email === 'kopitebbr@gmail.com';
  
  return (
    <section id="fruits" className="py-24 bg-white overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <SectionHeading 
            id="fruits-heading"
            badge="Farm to Table"
            title="Freshly harvested, hand-picked."
            subtitle="Straight from Nepal's best orchards. No preservatives, no cold storage, just pure nature."
            centered={false}
          />
          {isOwner && (
            <div className="flex gap-3">
              <button 
                onClick={onAdd}
                className="px-6 py-4 bg-gray-900 text-white rounded-[24px] text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-600 transition-all shadow-xl active:scale-95"
              >
                <Plus size={16} /> Add Fruit
              </button>
              <button 
                onClick={onReset}
                className="px-6 py-4 bg-gray-50 text-gray-400 border border-gray-100 rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2 active:scale-95"
              >
                <RefreshCcw size={16} /> Revert to default images
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {fruits.map((fruit, idx) => {
            const { avgRating, count } = getRatingData(fruit.id, reviews);
            return (
              <motion.div
                key={fruit.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-gray-50 rounded-[48px] p-4 border border-gray-100 hover:bg-white hover:shadow-2xl hover:shadow-green-100 transition-all duration-500 hover:-translate-y-2 flex flex-col"
              >
                <AnimatedFruitBg type={fruit.type} />
                <div className="relative aspect-square rounded-[36px] overflow-hidden mb-6 shadow-inner ring-1 ring-black/5">
                  <img 
                    src={fruit.image} 
                    alt={fruit.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {isOwner && (
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <label className="p-2.5 bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 cursor-pointer hover:bg-white transition-all transform hover:scale-110">
                        <Camera size={18} className="text-gray-600" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onImageUpload(fruit.id, file);
                          }}
                        />
                      </label>
                      <button 
                        onClick={() => onEdit(fruit)}
                        className="p-2.5 bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 hover:bg-white transition-all transform hover:scale-110"
                      >
                        <Edit2 size={18} className="text-blue-600" />
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-2xl shadow-sm flex items-center gap-1.5 border border-gray-100">
                    <Star size={12} className="fill-orange-400 text-orange-400" />
                    <span className="text-[10px] font-black">{avgRating > 0 ? avgRating.toFixed(1) : 'New'}</span>
                  </div>
                </div>

                <div className="px-2 flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-black tracking-tight text-gray-900 group-hover:text-green-600 transition-colors">{fruit.name}</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mb-6 line-clamp-2 leading-relaxed">{fruit.description}</p>
                </div>

                <div className="mt-auto px-1 pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Price per {fruit.unit}</p>
                      <p className="text-xl font-black text-gray-900">Rs. {fruit.price}</p>
                    </div>
                    <button 
                      onClick={() => onAddToCart(fruit)}
                      className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center hover:bg-green-600 hover:shadow-lg hover:shadow-green-100 transition-all active:scale-90"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const CartSidebar = ({ 
  cart, 
  onClose, 
  onUpdateQty, 
  onRemove, 
  selectedZoneId, 
  onZoneChange,
  onClearCart,
  paymentQR,
  onQRUpload,
  onAddActivity,
  user,
  autoCheckout = false
}: { 
  cart: CartItem[], 
  onClose: () => void, 
  onUpdateQty: (id: string, delta: number) => void,
  onRemove: (id: string) => void,
  selectedZoneId: string,
  onZoneChange: (id: string) => void,
  onClearCart: () => void,
  paymentQR: string,
  onQRUpload: (file: File) => void,
  onAddActivity: (activity: Omit<UserActivity, 'id' | 'date'>) => void,
  user: User | null,
  autoCheckout?: boolean
}) => {
  const [currentStep, setCurrentStep] = useState(0); // 0: Basket, 1: Delivery, 2: Payment
  const [isOrdered, setIsOrdered] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const isOwner = user?.email === 'kopitebbr@gmail.com';

  // Simulated Locations (Kathmandu)
  const [customerLocation] = useState({ lat: 27.7120, lng: 85.3131 });
  const [riderLocation, setRiderLocation] = useState({ lat: 27.7000, lng: 85.3000 });

  useEffect(() => {
    if (showTracking) {
      const interval = setInterval(() => {
        setRiderLocation(prev => ({
          lat: prev.lat + (customerLocation.lat - prev.lat) * 0.05,
          lng: prev.lng + (customerLocation.lng - prev.lng) * 0.05
        }));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [showTracking, customerLocation]);

  useEffect(() => {
    if (autoCheckout) {
      setCurrentStep(1);
    }
  }, [autoCheckout]);

  const steps = [
    { title: 'Basket', icon: <ShoppingBag size={14} /> },
    { title: 'Delivery', icon: <Home size={14} /> },
    { title: 'Payment', icon: <QrCode size={14} /> }
  ];

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  const deliveryFee = DELIVERY_ZONES.find(z => z.id === selectedZoneId)?.fee || 0;
  const total = subtotal + serviceCharge + deliveryFee;

  const handlePlaceOrder = (e: FormEvent) => {
    e.preventDefault();
    
    // If online payment, simulate processing
    if (selectedPaymentMethod !== 'cod') {
      setIsProcessingPayment(true);
      setTimeout(() => {
        completeOrder();
      }, 3000);
    } else {
      completeOrder();
    }
  };

  const completeOrder = () => {
    const orderNumber = `FV-${Math.floor(Math.random() * 10000)}`;
    const itemsList = cart.map(item => `• ${item.name} (${item.quantity} ${item.unit}) - Rs. ${item.price * item.quantity}`).join('\n');
    const paymentMethodName = PAYMENT_METHODS.find(p => p.id === selectedPaymentMethod)?.name || selectedPaymentMethod;
    const zoneName = DELIVERY_ZONES.find(z => z.id === selectedZoneId)?.name || 'Unknown Zone';

    const message = `*New Order: ${orderNumber}*\n\n` +
      `*Customer Details:*\n` +
      `Name: ${formData.name}\n` +
      `Phone: ${formData.phone}\n` +
      `Address: ${formData.address}\n` +
      `Zone: ${zoneName}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Billing:*\n` +
      `Subtotal: Rs. ${subtotal}\n` +
      `Service Charge: Rs. ${serviceCharge}\n` +
      `Delivery Fee: Rs. ${deliveryFee}\n` +
      `*Total: Rs. ${total.toFixed(0)}*\n\n` +
      `*Payment Status:* Paid via ${paymentMethodName}\n\n` +
      `Please confirm my order. Thank you!`;

    const whatsappUrl = `https://wa.me/9779840687207?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#16a34a', '#4ade80', '#ffffff']
    });
    
    setIsOrdered(true);
    setIsProcessingPayment(false);
    
    // Track activity
    onAddActivity({
      type: 'Purchase',
      title: orderNumber,
      amount: total,
      points: Math.floor(total / 100) // Earn 1 point per 100 Rs spent
    });
    
    onClearCart();
  };

  const currentZone = DELIVERY_ZONES.find(z => z.id === selectedZoneId);
  const currentPayment = PAYMENT_METHODS.find(p => p.id === selectedPaymentMethod);

  const ProgressIndicator = () => (
    <div className="px-8 pt-4 pb-6 border-b border-gray-100">
      <div className="flex justify-between relative">
        <div className="absolute top-4 left-0 w-full h-[2px] bg-gray-100 -z-10" />
        <div 
          className="absolute top-4 left-0 h-[2px] bg-green-600 transition-all duration-500 -z-10" 
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((s, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              idx < currentStep ? 'bg-green-600 text-white' : 
              idx === currentStep ? 'bg-white border-2 border-green-600 text-green-600 shadow-lg' : 
              'bg-white border-2 border-gray-100 text-gray-300'
            }`}>
              {idx < currentStep ? <Check size={16} /> : s.icon}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${
              idx <= currentStep ? 'text-gray-900' : 'text-gray-300'
            }`}>{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (isProcessingPayment) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-[110] flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative mb-12">
          <div className="w-32 h-32 rounded-full border-4 border-green-100 border-t-green-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={currentPayment?.icon} alt={currentPayment?.name} className="w-12 h-12 object-contain" />
          </div>
        </div>
        <h3 className="text-2xl font-black mb-2 italic">Securing Payment...</h3>
        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest animate-pulse">Redirecting to {currentPayment?.name} Gateway</p>
        
        <div className="mt-12 p-6 bg-gray-50 rounded-3xl w-full max-w-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount to Pay</span>
            <span className="text-sm font-black text-gray-900">Rs. {total.toFixed(0)}</span>
          </div>
          <div className="w-full h-1 bg-gray-200 rounded-full mt-4 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 3 }}
              className="h-full bg-green-600"
            />
          </div>
        </div>
      </motion.div>
    );
  }

  if (isOrdered) {
    if (showTracking) {
      return (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-[100] flex flex-col"
        >
          <div className="p-8 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter">Live Support</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Tracking your health delivery</p>
            </div>
            <button onClick={() => setShowTracking(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
              <ChevronRight size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <DeliveryTrackingMap customerLocation={customerLocation} riderLocation={riderLocation} />
            
            <div className="bg-green-50/50 p-6 rounded-[32px] border border-green-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <Truck size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Delivery Status</p>
                  <p className="text-sm font-black text-gray-900">Heading to your location</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-600">Rider started from warehouse</p>
                </div>
                <div className="w-px h-6 bg-green-200 ml-1" />
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">En route to your address</p>
                </div>
                <div className="w-px h-6 bg-gray-200 ml-1" />
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gray-200 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-400">Arriving soon (Est. 12 mins)</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" alt="Rider" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">Bishal Thapa</p>
                  <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <Star size={10} className="fill-yellow-400 border-none" /> 4.9 (2.4k deliveries)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => window.open('tel:9840687207')}
                className="w-12 h-12 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 active:scale-95 transition-all"
              >
                <Phone size={20} />
              </button>
            </div>
          </div>

          <div className="p-8 border-t border-gray-100">
            <button 
              onClick={onClose}
              className="w-full py-5 bg-gray-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-green-600 transition-all text-xs"
            >
              Done for now
            </button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-[100] flex flex-col p-12 items-center justify-center text-center"
      >
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8">
          <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-4xl font-black mb-4 tracking-tighter">Order Sent!</h2>
        <p className="text-gray-500 mb-2 leading-relaxed">
          Your order summary has been sent to WhatsApp.
        </p>
        <div className="bg-gray-50 p-6 rounded-3xl w-full mb-10 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Next Steps</p>
          <p className="text-xs font-medium text-gray-600 leading-relaxed mb-4">
            1. We tried to open WhatsApp with your order details.<br/>
            2. Please click "Send" in WhatsApp to confirm.<br/>
            3. Our team will verify and start preparation.
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                const orderNumber = `FV-${Math.floor(Math.random() * 10000)}`;
                const message = `*Order Confirmation Request*\n\nPlease check my latest order. Phone: ${formData.phone}`;
                window.open(`https://wa.me/9779840687207?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="w-full py-3 bg-[#25D366] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
            >
              <MessageCircle size={14} /> Open WhatsApp Manually
            </button>

            <button 
              onClick={() => setShowTracking(true)}
              className="w-full py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
            >
              <MapPin size={14} className="text-green-600" /> Track Live Delivery
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-gray-500">Contact:</span>
              <span className="text-gray-900">{formData.phone}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-full py-5 bg-gray-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-green-600 transition-all"
        >
          Back to Shopping
        </button>
      </motion.div>
    );
  }

  if (!showTracking && !isOrdered && !isProcessingPayment) {
    return (
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-[110] flex flex-col"
      >
        <div className="p-8 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter">Your Checkout</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">FreshVita Rewards Member</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <ProgressIndicator />

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {currentStep === 0 && (
            <div className="space-y-6">
              {cart.length === 0 ? (
                <div className="py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200 shadow-sm">
                    <ShoppingBag size={32} />
                  </div>
                  <p className="text-gray-400 font-bold">Your basket is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Review Items</label>
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 group bg-gray-50/50 p-4 rounded-3xl border border-transparent hover:border-green-100 transition-all">
                      <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 shrink-0 overflow-hidden shadow-sm">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-black text-gray-900 truncate pr-2">{item.name}</h4>
                          <button onClick={() => onRemove(item.id)} className="text-red-300 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl border border-gray-100">
                            <button onClick={() => onUpdateQty(item.id, -1)} className="text-gray-400 hover:text-green-600"><Minus size={14} /></button>
                            <span className="text-[10px] font-black text-gray-900 w-4 text-center">{item.quantity}</span>
                            <button onClick={() => onUpdateQty(item.id, 1)} className="text-gray-400 hover:text-green-600"><Plus size={14} /></button>
                          </div>
                          <p className="text-sm font-black text-gray-900">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 rounded-[32px] border border-green-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <MapPin size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Shipping Profile</p>
                  <p className="text-sm font-black text-gray-900">{currentZone?.name || 'Kathmandu'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Rahul Shrestha"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-green-600 transition-all font-bold text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">+977</span>
                    <input 
                      type="tel" 
                      placeholder="98XXXXXXXX"
                      className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-green-600 transition-all font-bold text-sm"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Detailed Address</label>
                  <textarea 
                    placeholder="House number, Street, Landmark"
                    rows={3}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-green-600 transition-all font-bold text-sm resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Choose Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`flex items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
                        selectedPaymentMethod === method.id 
                          ? 'border-green-600 bg-green-50 shadow-sm' 
                          : 'border-gray-50 hover:border-gray-100 bg-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-white shrink-0 border border-gray-100">
                        <img src={method.icon} alt={method.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-tight text-gray-900 leading-none mb-1 truncate">{method.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 truncate">{method.id === 'cod' ? 'Manual' : 'Digital'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPaymentMethod !== 'cod' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Scan to Pay</label>
                  <div className="relative group/qr bg-gray-50 rounded-[40px] p-8 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center overflow-hidden">
                    {paymentQR ? (
                      <div className="space-y-4 w-full">
                        <img src={paymentQR} alt="QR Code" className="w-full max-h-[200px] object-contain rounded-2xl mx-auto shadow-xl" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Company QR: Scan via App</p>
                      </div>
                    ) : (
                      <div className="py-8">
                        <QrCode size={40} className="text-gray-200 mb-3 mx-auto" />
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">QR Verification Pending</p>
                      </div>
                    )}

                    {isOwner && (
                      <label className="absolute inset-0 cursor-pointer bg-black/0 hover:bg-black/5 flex flex-col items-center justify-center transition-all opacity-0 hover:opacity-100 backdrop-blur-[2px]">
                        <div className="bg-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-900 border border-gray-100 scale-90 group-hover/qr:scale-100 transition-transform">
                          <Camera size={16} className="text-green-600" /> 
                          {paymentQR ? 'Update Company QR' : 'Upload QR Code'}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onQRUpload(file);
                          }}
                        />
                        <p className="mt-4 text-[9px] text-white/90 font-black uppercase tracking-tighter bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">Admin Only Control</p>
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="p-6 bg-gray-900 rounded-[32px] text-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1 leading-none">Earning Today</p>
                  <p className="text-xl font-black italic">+{Math.floor(total / 100)} PTS</p>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-green-400">
                  <Trophy size={24} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 pb-10 border-t border-gray-100 bg-white shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Basket Subtotal</span>
              <span className="text-sm font-black text-gray-900 tracking-tight italic">Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-50">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 underline decoration-green-600 underline-offset-8 decoration-2 italic">Total to Settle</span>
              <span className="text-3xl font-black text-green-600 tracking-tighter italic">Rs. {total.toFixed(0)}</span>
            </div>
          </div>

          <div className="flex gap-4">
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="w-20 h-16 bg-gray-50 text-gray-400 rounded-3xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 active:scale-95"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            
            <button 
              onClick={() => {
                if (currentStep < 2) {
                  if (currentStep === 1 && (!formData.name || !formData.phone || !formData.address)) {
                    alert('Please provide valid delivery info first!');
                    return;
                  }
                  setCurrentStep(prev => prev + 1);
                } else {
                  handlePlaceOrder({ preventDefault: () => {} } as any);
                }
              }}
              disabled={cart.length === 0}
              className={`flex-1 h-16 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all text-[11px] ${
                cart.length === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' : 'bg-gray-900 text-white hover:bg-green-600 shadow-green-100'
              }`}
            >
              {currentStep === 0 ? 'Proceed to Address' : 
               currentStep === 1 ? 'Select Payment' : 
               `Confirm Payment`}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isOrdered) {
    if (showTracking) {
      return (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-[120] flex flex-col"
        >
          <div className="p-8 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter">Live Support</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Tracking your health delivery</p>
            </div>
            <button onClick={() => setShowTracking(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
              <ChevronRight size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <DeliveryTrackingMap customerLocation={customerLocation} riderLocation={riderLocation} />
            
            <div className="bg-green-50/50 p-6 rounded-[32px] border border-green-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <Truck size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Delivery Status</p>
                  <p className="text-sm font-black text-gray-900">Heading to your location</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-600">Rider started from warehouse</p>
                </div>
                <div className="w-px h-6 bg-green-200 ml-1" />
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">En route to your address</p>
                </div>
                <div className="w-px h-6 bg-gray-200 ml-1" />
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gray-200 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-400">Arriving soon (Est. 12 mins)</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" alt="Rider" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">Bishal Thapa</p>
                  <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <Star size={10} className="fill-yellow-400 border-none" /> 4.9 (2.4k deliveries)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => window.open('tel:9840687207')}
                className="w-12 h-12 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 active:scale-95 transition-all"
              >
                <Phone size={20} />
              </button>
            </div>
          </div>

          <div className="p-8 border-t border-gray-100">
            <button 
              onClick={onClose}
              className="w-full py-5 bg-gray-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-green-600 transition-all text-xs"
            >
              Done for now
            </button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-[120] flex flex-col p-12 items-center justify-center text-center"
      >
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8">
          <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-4xl font-black mb-4 tracking-tighter">Order Sent!</h2>
        <p className="text-gray-500 mb-2 leading-relaxed">
          Your order summary has been sent to WhatsApp.
        </p>
        <div className="bg-gray-50 p-6 rounded-3xl w-full mb-10 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Next Steps</p>
          <p className="text-xs font-medium text-gray-600 leading-relaxed mb-4">
            1. We tried to open WhatsApp with your order details.<br/>
            2. Please click "Send" in WhatsApp to confirm.<br/>
            3. Our team will verify and start preparation.
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                const message = `*Order Confirmation Request*\n\nPlease check my latest order. Phone: ${formData.phone}`;
                window.open(`https://wa.me/9779840687207?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="w-full py-3 bg-[#25D366] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
            >
              <MessageCircle size={14} /> Open WhatsApp Manually
            </button>

            <button 
              onClick={() => setShowTracking(true)}
              className="w-full py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
            >
              <MapPin size={14} className="text-green-600" /> Track Live Delivery
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-gray-500">Contact:</span>
              <span className="text-gray-900">{formData.phone}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-full py-5 bg-gray-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-green-600 transition-all"
        >
          Back to Shopping
        </button>
      </motion.div>
    );
  }

  return null;
};

const FitnessSection = ({ onAddToCart }: { onAddToCart: (plan: FitnessPlan, direct?: boolean) => void }) => {
  return (
    <section id="fitness" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading 
          id="fitness-heading"
          badge="Training"
          title="Fuel your body. Train your mind."
          subtitle="Personalized plans combining nutrition science and expert workouts."
        />

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {FITNESS_PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`p-10 rounded-[50px] flex flex-col h-full bg-white border ${i === 1 ? 'border-green-500 shadow-2xl shadow-green-100 ring-4 ring-green-50' : 'border-gray-100 shadow-sm'}`}
            >
              <div className="mb-8">
                <span className="text-xs font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full mb-4 inline-block">
                  {plan.level}
                </span>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-500">{plan.description}</p>
              </div>
              
              <div className="text-4xl font-bold text-gray-900 mb-8 font-display">
                NPR {plan.price} <span className="text-base text-gray-400 font-normal font-sans">/month</span>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((f, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-gray-600 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                      <ChevronRight size={14} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <button 
                  onClick={() => onAddToCart(plan, false)}
                  className="flex-1 py-4 rounded-2xl font-bold bg-gray-50 text-gray-900 hover:bg-gray-100 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Bag
                </button>
                <button 
                  onClick={() => onAddToCart(plan, true)}
                  className={`flex-[2] py-4 rounded-2xl font-bold transition-all text-center text-sm ${i === 1 ? 'bg-green-600 text-white shadow-xl shadow-green-200 hover:bg-green-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                >
                  Buy Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Workout Preview */}
        <div className="bg-white rounded-[50px] p-10 md:p-16 text-gray-900 grid md:grid-cols-2 gap-16 items-center shadow-2xl shadow-green-100 border border-green-50">
          <div>
            <h3 className="text-4xl font-bold mb-6 font-display text-gray-900">Sample Weekly Workout</h3>
            <p className="text-gray-500 mb-10 leading-relaxed font-medium">
              A balanced 7-day plan combining strength, cardio, and recovery. 
              Designed to work with your energy levels throughout the week.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { day: 'Mon', title: 'Upper Body', time: '45m' },
                { day: 'Tue', title: 'Cardio Core', time: '40m' },
                { day: 'Wed', title: 'Recovery', time: '30m' },
                { day: 'Thu', title: 'Power Legs', time: '45m' },
              ].map((w, i) => (
                <div key={i} className="flex items-center gap-4 bg-green-50/50 p-4 rounded-2xl border border-green-100 hover:bg-green-100/50 transition-all group">
                  <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center font-bold text-xs group-hover:rotate-12 transition-transform shadow-lg shadow-green-200">
                    {w.day}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm tracking-wide text-gray-900">{w.title}</h5>
                    <p className="text-xs text-green-600 flex items-center gap-1 font-bold"><Clock size={12}/> {w.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl ring-1 ring-black/5">
              <img 
                src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800" 
                alt="Fitness Training" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500 rounded-full blur-[80px] opacity-20 -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

const CheckupsSection = ({ onAddToCart, reviews, onRate }: { 
  onAddToCart: (pkg: CheckupPackage, direct?: boolean) => void,
  reviews: Review[],
  onRate: (id: string, name: string) => void
}) => {
  return (
    <section id="checkups" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <SectionHeading 
            id="checkups-heading"
            badge="Laboratory"
            title="Health checkups, at your doorstep."
            subtitle="Skip the queues. Certified experts collect samples at home. Certified results in 24h."
            centered={false}
          />
          <div className="flex gap-4">
            <div className="p-4 bg-blue-50 rounded-3xl text-center min-w-[120px]">
              <div className="text-2xl font-bold text-blue-600 font-display">8k+</div>
              <div className="text-[10px] uppercase font-bold text-blue-400">Tests Done</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-3xl text-center min-w-[120px]">
              <div className="text-2xl font-bold text-orange-600 font-display">50+</div>
              <div className="text-[10px] uppercase font-bold text-orange-400">Lab Partners</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {CHECKUP_PACKAGES.map((pkg, i) => {
            const { avgRating, count } = getRatingData(pkg.id, reviews);
            return (
              <div key={pkg.id} className="bg-gray-50 p-10 rounded-[50px] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-3xl font-bold text-gray-900">{pkg.name}</h3>
                        <button 
                          onClick={() => onRate(pkg.id, pkg.name)}
                          className="bg-white/90 backdrop-blur px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 hover:bg-white transition-all active:scale-95 border border-gray-100/50"
                        >
                          <Star size={10} className="fill-orange-400 text-orange-400" />
                          <span className="text-[10px] font-black text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
                          <span className="text-[10px] text-gray-400 font-bold">({count})</span>
                        </button>
                      </div>
                      <p className="text-gray-500 max-w-xs">{pkg.description}</p>
                    </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400 line-through mb-1">NPR {pkg.originalPrice}</div>
                    <div className="text-3xl font-bold text-blue-600 font-display">NPR {pkg.price}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-10">
                  {pkg.tests.map((test, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs font-semibold text-gray-600">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      {test}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => onAddToCart(pkg, false)}
                    className="flex-1 py-5 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:border-blue-600 hover:text-blue-600 transition-all"
                  >
                    <Plus size={20} /> Add to Bag
                  </button>
                  <button 
                    onClick={() => onAddToCart(pkg, true)}
                    className="flex-[2] bg-gray-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all group/btn shadow-xl shadow-gray-200 hover:shadow-blue-200"
                  >
                    Book Now <ArrowUpRight size={20} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                  </button>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-[60px] -z-10 group-hover:scale-150 transition-transform duration-1000" />
            </div>
          );
        })}
      </div>

        <div className="mt-20">
          <h4 className="text-xl font-bold text-gray-900 mb-8">Speciality Panels</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {['Heart Health', 'Diabetes Care', 'Bone & Joint', 'Thyroid', 'Liver Function', 'Vitamin Panel'].map((item, i) => (
              <div key={i} className="bg-white border border-gray-100 p-6 rounded-3xl text-center hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 mx-auto group-hover:scale-110 transition-transform font-display">
                  <Activity size={20} />
                </div>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ReportsSection = () => {
  return (
    <section id="reports" className="py-24 bg-white text-gray-900 relative overflow-hidden border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-12 gap-16">
          <div className="md:col-span-12 lg:col-span-5">
            <SectionHeading 
              id="reports-heading"
              badge="Records"
              title="Your Health history, secured."
              subtitle="All your reports in one private vault. Download, track trends, or share with doctors in one click."
              centered={false}
            />
            <div className="space-y-6 mt-12 mb-12 lg:mb-0">
              {[
                { title: 'Secure & Private', desc: 'End-to-end encrypted storage.', icon: <ShieldCheck className="text-green-600" /> },
                { title: 'Always Available', desc: 'Access history anywhere, anytime.', icon: <Download className="text-green-600" /> },
                { title: 'Doctor Review', icon: <Heart className="text-green-600" />, desc: 'Certified analysis included.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-6 bg-green-50/50 rounded-3xl border border-green-100">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h5 className="font-bold mb-1 text-gray-900">{item.title}</h5>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="hidden lg:block lg:col-span-1" />

          <div className="md:col-span-12 lg:col-span-6 bg-white rounded-[60px] p-8 md:p-12 shadow-2xl shadow-green-100/50 overflow-hidden text-gray-900 border border-green-100">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-bold font-display tracking-tight text-gray-900">Recent Reports</h3>
              <button className="text-green-600 font-bold text-sm">View All</button>
            </div>
            
            <div className="space-y-6">
              {REPORTS_DATA.map((r, i) => (
                <motion.div 
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gray-50 rounded-3xl p-6 border border-gray-100 group hover:border-green-200 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-bold mb-1 text-gray-900">{r.title}</h4>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{r.date}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${r.status === 'Normal' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    {r.summary}
                  </p>
                  <div className="flex gap-3">
                    <button className="p-2 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-gray-400"><Download size={18} /></button>
                    <button className="flex-grow bg-green-600 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-green-700 transition-all shadow-lg shadow-green-100">Details</button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 pt-10 border-t border-gray-100 text-center">
              <button className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold text-sm w-full hover:bg-green-600 transition-all shadow-xl shadow-gray-200">
                Upload Existing Report
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[120px] -z-0" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-green-500/5 rounded-full blur-[100px] -z-0" />
    </section>
  );
};

const RewardsSection = ({ 
  rewards, 
  points, 
  onRedeem, 
  onImageUpload,
  user,
  onEdit,
  onAdd
}: { 
  rewards: Reward[], 
  points: number, 
  onRedeem: (reward: Reward) => void,
  onImageUpload: (id: string, file: File) => void,
  user: User | null,
  onEdit: (reward: Reward) => void,
  onAdd: () => void
}) => {
  const isOwner = user?.email === 'kopitebbr@gmail.com';
  return (
    <section id="rewards" className="py-24 bg-gray-50 overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <SectionHeading 
            id="rewards-heading"
            badge="Loyalty"
            title="Earn rewards while you stay healthy."
            subtitle="Get points for every shopping and lab test. Redeem them for exclusive hampers and wellness vouchers."
            centered={false}
          />
          <div className="flex items-center gap-3">
             {isOwner && (
              <button 
                onClick={onAdd}
                className="px-6 py-4 bg-gray-900 text-white rounded-[24px] text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-600 transition-all shadow-xl active:scale-95"
              >
                <Plus size={16} /> Add Reward
              </button>
            )}
            <div className="p-8 bg-green-600 rounded-[40px] text-white flex items-center gap-6 shadow-2xl shadow-green-200 shrink-0">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Your Balance</p>
                <p className="text-4xl font-bold font-display">{points.toLocaleString()}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center">
                <Gift size={32} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {rewards.map((reward, i) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500"
            >
              <div className="h-48 overflow-hidden relative">
                <img src={reward.image} alt={reward.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-green-600 border border-green-100">
                  {reward.type}
                </div>
                
                {/* Image Upload Trigger - Owner Only */}
                {isOwner && (
                  <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="bg-white/90 hover:bg-white p-2.5 rounded-xl border border-gray-100 cursor-pointer shadow-lg transform hover:scale-110 transition-all">
                      <Camera size={16} className="text-gray-600" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onImageUpload(reward.id, file);
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => onEdit(reward)}
                      className="bg-white/90 hover:bg-white p-2.5 rounded-xl border border-gray-100 shadow-lg transform hover:scale-110 transition-all"
                    >
                      <Edit2 size={16} className="text-blue-600" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Delete this reward?')) {
                          deleteDoc(doc(db, 'rewards', reward.id));
                        }
                      }}
                      className="bg-white/90 hover:bg-red-50 p-2.5 rounded-xl border border-gray-100 shadow-lg transform hover:scale-110 transition-all"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{reward.title}</h3>
                <div className="flex items-center gap-2 text-green-600 font-bold mb-6">
                  <Trophy size={16} />
                  <span>{reward.points.toLocaleString()} Points required</span>
                </div>
                
                <button 
                  onClick={() => onRedeem(reward)}
                  disabled={points < reward.points}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all border ${
                    points >= reward.points 
                      ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-lg shadow-green-100' 
                      : 'bg-gray-50 text-gray-400 border-transparent cursor-not-allowed'
                  }`}
                >
                  {points >= reward.points ? 'Redeem Reward' : `Need ${(reward.points - points).toLocaleString()} more points`}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 p-10 bg-white rounded-[50px] border border-gray-100 flex flex-col md:flex-row items-center gap-10">
          <div className="w-24 h-24 bg-orange-100 rounded-[40px] flex items-center justify-center text-orange-600 shrink-0">
            <Zap size={40} />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-900 mb-2">How to earn points?</h4>
            <p className="text-gray-500 leading-relaxed max-w-2xl">
              Earn 10 points for every NPR 100 spent on fruits. Get 500 bonus points for your first health checkup. 
              Refer a friend and get 1,000 points once they make their first order.
            </p>
          </div>
          <button className="ml-auto bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-green-600 transition-all whitespace-nowrap">
            View My Activity
          </button>
        </div>
      </div>
    </section>
  );
};

const DeliveryChecker = () => {
  const [zip, setZip] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const checkDelivery = () => {
    if (!zip) return;
    const available = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan'].some(city => 
      zip.toLowerCase().includes(city.toLowerCase())
    );
    setStatus(available ? 'available' : 'unavailable');
  };

  return (
    <div className="bg-gray-100/50 p-1.5 rounded-[24px] border border-gray-100 flex flex-col sm:flex-row gap-2 max-w-lg shadow-sm focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
      <input 
        type="text" 
        placeholder="Delivery city (e.g. Kathmandu)" 
        value={zip}
        onChange={(e) => { setZip(e.target.value); setStatus(null); }}
        className="flex-grow bg-transparent px-5 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none font-bold text-sm"
      />
      <button 
        onClick={checkDelivery}
        className="bg-green-600 text-white px-6 py-3 rounded-[18px] font-bold text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-green-200"
      >
        {status === 'available' ? <Check size={16}/> : <Search size={16}/>}
        {status === 'available' ? 'Available' : status === 'unavailable' ? 'Coming Soon' : 'Check'}
      </button>
    </div>
  );
};

const FAQSection = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-6">
        <SectionHeading 
          badge="Support"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about our health and delivery services."
          id="faq-heading"
        />

        <div className="space-y-4">
          {FAQ_DATA.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-white rounded-[32px] overflow-hidden border transition-all duration-300 ${
                activeIndex === idx ? 'border-green-200 shadow-xl shadow-green-50' : 'border-gray-100 hover:border-green-100'
              }`}
            >
              <button
                onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
                className="w-full px-8 py-6 flex items-center justify-between text-left group"
              >
                <span className={`text-lg font-bold transition-colors ${
                  activeIndex === idx ? 'text-green-600' : 'text-gray-900 group-hover:text-green-600'
                }`}>
                  {faq.question}
                </span>
                <div className={`p-2 rounded-xl transition-all ${
                  activeIndex === idx ? 'bg-green-600 text-white rotate-180' : 'bg-gray-50 text-gray-400 group-hover:bg-green-50 group-hover:text-green-600'
                }`}>
                  <Plus size={20} className={activeIndex === idx ? 'rotate-45' : ''} />
                </div>
              </button>
              
              <AnimatePresence>
                {activeIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-8 pb-8 text-gray-500 leading-relaxed font-medium">
                      <div className="h-px bg-gray-100 mb-6" />
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 bg-gray-900 rounded-[40px] p-8 md:p-12 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-green-500/20 transition-all duration-700" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -ml-32 -mb-32 group-hover:bg-green-500/20 transition-all duration-700" />
          
          <h3 className="text-2xl font-black text-white mb-4 relative z-10">Still have questions?</h3>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto font-medium relative z-10">
            Can't find the answer you're looking for? Please chat with our friendly team in real-time.
          </p>
          <a 
            href="https://wa.me/9779840687207" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-gray-900 px-10 py-5 rounded-[32px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-xl active:scale-95 relative z-10"
          >
            <MessageCircle size={20} /> Chat with support
          </a>
        </div>
      </div>
    </section>
  );
};

const ActivitySection = ({ activities, onRate }: { activities: UserActivity[], onRate: (id: string, name: string) => void }) => {
  return (
    <section id="activity" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <SectionHeading 
            badge="History"
            id="activity-heading"
            title="Your Member Activity"
            subtitle="Track your journey, monitor your spending, and see your points grow with every healthy choice."
            centered={false}
          />
        </div>

        {activities.length === 0 ? (
          <div className="bg-gray-50 p-20 rounded-[48px] text-center border-2 border-dashed border-gray-200 text-gray-900">
            <Activity size={48} className="mx-auto text-gray-200 mb-6" />
            <p className="text-gray-400 font-bold text-xl">No activity recorded yet.<br/>Start shopping to see your history!</p>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden text-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Date & Time</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Activity</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount Spent</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Points</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-all">
                            <Clock size={16} />
                          </div>
                          <span className="text-sm font-bold text-gray-600">{activity.date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest mb-1 ${
                            activity.type === 'Purchase' ? 'bg-green-100 text-green-700' : 
                            activity.type === 'Review' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {activity.type}
                          </span>
                          <p className="text-sm font-black text-gray-900">{activity.title}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-gray-900">
                          {activity.amount > 0 ? `Rs. ${activity.amount.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-2 text-sm font-black ${
                          activity.type === 'Purchase' || activity.type === 'Review' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <Trophy size={14} />
                          <span>{activity.type === 'Purchase' || activity.type === 'Review' ? '+' : '-'}{activity.points.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {activity.type === 'Purchase' && (
                          <button 
                            onClick={() => onRate(activity.title, activity.title)}
                            className="bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                            Add Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 leading-none">Total Spent</p>
                  <p className="text-xl font-black text-gray-900">Rs. {activities.filter(a => a.type === 'Purchase').reduce((sum, a) => sum + (a.amount || 0), 0).toLocaleString()}</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 leading-none">Lifetime Points</p>
                  <p className="text-xl font-black text-green-600">+{activities.filter(a => a.type === 'Purchase').reduce((sum, a) => sum + (a.points || 0), 0).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 italic">Showing last 50 member activities</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const Testimonials = () => {
  const testimonials = [
    { name: "Anish Sharma", role: "Avid Runner", text: "FreshVita's fitness plans are tailored perfectly for the local terrain. The fruits are always farm-fresh!", rating: 5 },
    { name: "Priyanka Thapa", role: "Working Mom", text: "Home lab collection saved my life. No more waiting in hospital queues with my kids.", rating: 5 },
    { name: "Rajesh Gurung", role: "Fitness Enthusiast", text: "The rewards system is actually worth it. Got my first free fruit basket last week!", rating: 4 }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading 
          id="testimonials-heading"
          badge="Community"
          title="What our family says."
          subtitle="Join thousands of Nepalese families who have transformed their health with FreshVita."
          centered={true}
        />
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {testimonials.map((t, i) => (
            <div key={i} className="p-10 bg-gray-50 rounded-[40px] border border-gray-100 relative group">
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={16} className={j < t.rating ? "fill-orange-400 text-orange-400" : "text-gray-300"} />
                ))}
              </div>
              <p className="text-lg text-gray-700 italic border-l-4 border-green-500 pl-6 mb-8 group-hover:text-gray-900 transition-colors">
                "{t.text}"
              </p>
              <div>
                <h5 className="font-bold text-gray-900">{t.name}</h5>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden" id="home">
      {/* Background blobs for visual interest */}
      <div className="absolute top-0 right-0 -z-10 opacity-30 translate-x-1/2 -translate-y-1/2">
        <div className="w-[600px] h-[600px] bg-green-200 rounded-full blur-[120px]" />
      </div>
      <div className="absolute bottom-0 left-0 -z-10 opacity-20 -translate-x-1/2 translate-y-1/2">
        <div className="w-[400px] h-[400px] bg-orange-200 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            24/7 Wellness Partner
          </div>
          <h1 className="text-5xl md:text-8xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-8 font-display">
            <a href="#home" className="hover:text-green-600 transition-colors">Eat fresh.</a><br />
            <span className="text-green-600 block sm:inline italic">Live well.</span><br />
            Delivered home.
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-lg mb-8">
            Hand-picked fruits, at-home medical checkups, and instant lab reports — one app for your whole wellness routine.
          </p>
          
          <div className="mb-12">
            <DeliveryChecker />
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            <a href="#fruits" className="bg-green-600 text-white px-10 py-5 rounded-3xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-green-200 group">
              Shop fruits <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#checkups" className="bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-3xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm">
              Book a test <Stethoscope size={22} className="text-green-600" />
            </a>
          </div>
          
          <div className="mt-16 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <img 
                  key={i} 
                  src={`https://picsum.photos/seed/user${i}/100/100`} 
                  alt="User" 
                  className="w-12 h-12 rounded-full border-4 border-white object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            <p className="font-medium"><span className="text-gray-900 font-bold">20,000+</span> healthy families joined</p>
          </div>
        </motion.div>

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative z-10"
          >
            <div className="rounded-[80px] overflow-hidden shadow-2xl border-[12px] border-white ring-1 ring-gray-100">
              <img 
                src="https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&q=80&w=1000" 
                alt="Great Fresh Fruit Bowl" 
                className="w-full aspect-[4/5] md:aspect-square object-cover hover:scale-105 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Floating nutrition card */}
            <motion.div 
               initial={{ x: 30, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               transition={{ delay: 1, duration: 0.8 }}
               className="absolute -bottom-6 -right-6 bg-white p-6 rounded-[32px] shadow-2xl border border-gray-100 max-w-[180px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seasonal Tip</span>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Berries are at 100% ripeness today.</p>
            </motion.div>
          </motion.div>
          
          {/* Decorative elements */}
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-400 rounded-3xl -z-10 rotate-12 blur-[100px] opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-400 rounded-full -z-10 opacity-20 blur-[120px]" />
          
          {/* Floating tag */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-8 top-1/4 z-20 bg-white p-5 rounded-3xl shadow-2xl border border-gray-100 flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
              <Apple size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Organic</p>
              <p className="text-sm font-bold text-gray-900">100% Farm Fresh</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  return (
    <section className="py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-green-600 rounded-[70px] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-green-200">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_70%)]" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <h2 className="text-4xl md:text-7xl font-bold text-white mb-10 tracking-tight leading-tight font-display">
              Healthy living,<br />Simplified.
            </h2>
            <p className="text-green-50 text-xl md:text-2xl mb-12 max-w-xl mx-auto opacity-90 leading-relaxed font-medium">
              Join 20,000+ healthy families. NPR 200 off your first order.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <a href="#fruits" className="bg-white text-green-700 px-12 py-6 rounded-[30px] font-bold text-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all text-center">
                Shop Fruits
              </a>
              <a href="#checkups" className="bg-green-700/50 backdrop-blur-sm text-white px-12 py-6 rounded-[30px] font-bold text-xl hover:bg-green-800 transition-all border border-green-500/30 text-center">
                Checkups
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-24 border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-8">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute top-0 left-1 w-4 h-4 bg-green-500 rounded-full" />
                <div className="absolute top-0 right-1 w-4 h-4 bg-green-600 rounded-full" />
                <div className="absolute bottom-1 left-3 w-4 h-4 bg-green-400 rounded-full" />
                <div className="absolute top-2 left-3 w-3 h-3 bg-green-300 rounded-full" />
              </div>
              <span className="text-2xl font-bold tracking-tight font-display">FreshVita</span>
            </div>
            <p className="text-gray-500 leading-relaxed mb-8">
              Empowering families with fresh food and accessible care. Delivering wellness to your door.
            </p>
            <div className="flex gap-4">
              <a href="mailto:kopitebbr@gmail.com" className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm">
                <Mail size={18} />
              </a>
              <a href="https://instagram.com/freshvita_np" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm">
                <Instagram size={18} />
              </a>
              <a href="https://wa.me/9779840687207" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm">
                <MessageCircle size={18} />
              </a>
              <a href="https://twitter.com/freshvita_np" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm">
                <Twitter size={18} />
              </a>
              <a href="https://linkedin.com/company/freshvita" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h6 className="font-bold text-gray-900 mb-8 uppercase text-xs tracking-[0.2em]">Services</h6>
            <ul className="space-y-5 text-gray-500 font-medium">
              <li><a href="#fruits" className="hover:text-green-600 transition-colors">Fruit Delivery</a></li>
              <li><a href="#fitness" className="hover:text-green-600 transition-colors">Fitness Plans</a></li>
              <li><a href="#checkups" className="hover:text-green-600 transition-colors">Blood Tests</a></li>
              <li><a href="#reports" className="hover:text-green-600 transition-colors">Lab Reports</a></li>
            </ul>
          </div>
          
          <div>
            <h6 className="font-bold text-gray-900 mb-8 uppercase text-xs tracking-[0.2em]">Company</h6>
            <ul className="space-y-5 text-gray-500 font-medium">
              <li><a href="#" className="hover:text-green-600 transition-colors">Our Farms</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Certified Labs</a></li>
              <li><a href="https://freshvita.vercel.app" className="hover:text-green-600 transition-colors">Vercel App</a></li>
              <li><a href="mailto:kopitebbr@gmail.com" className="hover:text-green-600 transition-colors">Contact Founder</a></li>
              <li><a href="mailto:kopitebbr@gmail.com" className="hover:text-green-600 transition-colors">Support</a></li>
            </ul>
          </div>

          <div>
            <h6 className="font-bold text-gray-900 mb-8 uppercase text-xs tracking-[0.2em]">Fresh Start</h6>
            <div className="bg-gray-50 p-6 rounded-[30px] border border-gray-100">
              <p className="text-sm text-gray-600 mb-4 font-semibold">Join the mailing list</p>
              <div className="flex gap-2">
                <input type="email" placeholder="Email" className="bg-white px-4 py-3 rounded-2xl w-full text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                <button className="bg-gray-900 text-white p-3 rounded-2xl hover:bg-green-600 transition-all"><ChevronRight size={18} /></button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-400 font-medium font-sans">
          <div className="text-center md:text-left">
            <p>© 2026 FreshVita Inc. Built with wellness in mind.</p>
            <p className="mt-1 text-gray-800 font-bold italic font-display underline decoration-green-500 decoration-2 underline-offset-4">
              "Eat well, live well." — Bimal Babu Rijal, Founder
            </p>
          </div>
          <div className="flex gap-10">
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
            <a href="#" className="hover:text-gray-900">Health Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const EditItemModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  item, 
  type 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: any) => void,
  item?: any,
  type: 'fruit' | 'reward'
}) => {
  const [formData, setFormData] = useState<any>(item || {});

  useEffect(() => {
    if (item) setFormData(item);
    else if (type === 'fruit') {
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        description: '',
        price: 0,
        unit: 'kg',
        type: 'tropical',
        image: 'https://images.unsplash.com/photo-1550258114-189fa29b0008?w=800'
      });
    } else {
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        title: '',
        points: 0,
        image: 'https://images.unsplash.com/photo-1543158181-e6f9f670c5b5?w=800',
        type: 'Voucher'
      });
    }
  }, [item, type, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-24 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-xl rounded-[48px] p-10 shadow-2xl relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-2xl transition-colors" title="Close modal">
          <X size={20} className="text-gray-400" />
        </button>

        <div className="mb-10">
          <h2 className="text-3xl font-black italic tracking-tighter mb-2">
            {item ? 'Modify' : 'Add New'} {type === 'fruit' ? 'Fruit' : 'Reward'}
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600">Admin Control Panel</p>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Name / Title</label>
            <input 
              type="text" 
              value={type === 'fruit' ? formData.name : formData.title}
              onChange={(e) => setFormData({ ...formData, [type === 'fruit' ? 'name' : 'title']: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder={`Enter ${type} name`}
            />
          </div>

          {type === 'fruit' && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 min-h-[100px]"
                  placeholder="Tell us about this fruit..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Price (NPR)</label>
                  <input 
                    type="number" 
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Unit</label>
                  <select 
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="kg">kilogram (kg)</option>
                    <option value="dozen">dozen</option>
                    <option value="pack">pack</option>
                    <option value="piece">piece</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Animation Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="tropical">Tropical</option>
                  <option value="berry">Berry</option>
                  <option value="citrus">Citrus</option>
                  <option value="stone">Stone Fruit</option>
                  <option value="melon">Melon</option>
                </select>
              </div>
            </>
          )}

          {type === 'reward' && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Points Required</label>
                <input 
                  type="number" 
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Reward Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="Voucher">Voucher</option>
                  <option value="Gift Hamper">Gift Hamper</option>
                  <option value="Service">Service</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="mt-10 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex-[2] py-5 bg-gray-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-green-600 transition-all shadow-xl shadow-gray-200"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

const BottomNav = ({ onOpenCart, cartCount, user, onSignIn }: { onOpenCart: () => void, cartCount: number, user: User | null, onSignIn: () => void }) => {
  const links = [
    { name: 'Shop', href: '#fruits', icon: <Apple size={20} /> },
    { name: 'Bag', href: '#', onClick: (e: any) => { e.preventDefault(); onOpenCart(); }, icon: <ShoppingBag size={20} />, count: cartCount },
    { name: 'Activity', href: '#activity', icon: <Activity size={20} /> },
    { 
      name: user ? 'Me' : 'Join', 
      href: '#', 
      onClick: (e: any) => { 
        e.preventDefault(); 
        if (!user) onSignIn();
        else window.location.href = '#activity';
      }, 
      icon: user ? <img src={user.avatar} className="w-5 h-5 rounded-full" /> : <ShieldCheck size={20} /> 
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex justify-between items-center px-4 py-2 pb-safe shadow-2xl">
      {links.map((link) => (
        <a 
          key={link.name} 
          href={link.href}
          onClick={link.onClick}
          className="flex flex-col items-center gap-1 p-2 min-w-[70px] text-gray-400 hover:text-green-600 active:scale-95 transition-all relative"
        >
          {link.icon}
          {link.count !== undefined && link.count > 0 && (
            <span className="absolute top-1 right-4 bg-green-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
              {link.count}
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest">{link.name}</span>
        </a>
      ))}
    </div>
  );
};

const handlePurchase = () => {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#16a34a', '#4ade80', '#ffffff']
  });
};

export default function App() {
  const [fruits, setFruits] = useState<Fruit[]>(FRUITS_DATA);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shouldAutoCheckout, setShouldAutoCheckout] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(DELIVERY_ZONES[0].id);
  const [userPoints, setUserPoints] = useState(100);
  const [rewards, setRewards] = useState<Reward[]>(REWARDS_DATA);
  const [paymentQR, setPaymentQR] = useState('');
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<{ id: string, name: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminItem, setAdminItem] = useState<any>(null);
  const [adminType, setAdminType] = useState<'fruit' | 'reward'>('fruit');

  const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user document exists, if not create it
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              points: 100, // Welcome points
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
            };
            await setDoc(userDocRef, newUser);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setCurrentUser(null);
        setUserPoints(0);
        setActivities([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. User Data Listener
  useEffect(() => {
    if (!auth.currentUser) return;

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as User;
        setCurrentUser(data);
        setUserPoints(data.points);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`));

    const activitiesQuery = query(collection(db, 'users', auth.currentUser.uid, 'activities'), orderBy('date', 'desc'));
    const unsubActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivity));
      setActivities(docs);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}/activities`));

    return () => {
      unsubUser();
      unsubActivities();
    };
  }, [auth.currentUser]);

  // 3. Global Data Listeners
  useEffect(() => {
    const unsubFruits = onSnapshot(collection(db, 'fruits'), (snapshot) => {
      if (snapshot.empty && auth.currentUser?.email === 'kopitebbr@gmail.com') {
        const batch = writeBatch(db);
        FRUITS_DATA.forEach(f => {
          batch.set(doc(db, 'fruits', f.id), f);
        });
        batch.commit();
      } else if (!snapshot.empty) {
        setFruits(snapshot.docs.map(doc => doc.data() as Fruit));
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'fruits'));

    const unsubRewards = onSnapshot(collection(db, 'rewards'), (snapshot) => {
      if (snapshot.empty && auth.currentUser?.email === 'kopitebbr@gmail.com') {
        const batch = writeBatch(db);
        REWARDS_DATA.forEach(r => {
          batch.set(doc(db, 'rewards', r.id), r);
        });
        batch.commit();
      } else if (!snapshot.empty) {
        setRewards(snapshot.docs.map(doc => doc.data() as Reward));
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'rewards'));

    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      if (!snapshot.empty) {
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'reviews'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'company'), (doc) => {
      if (doc.exists()) {
        setPaymentQR(doc.data().paymentQR || '');
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/company'));

    return () => {
      unsubFruits();
      unsubRewards();
      unsubReviews();
      unsubSettings();
    };
  }, [auth.currentUser]);

  const addActivity = async (activity: Omit<UserActivity, 'id' | 'date'>) => {
    if (!auth.currentUser) return;

    try {
      const activityData = {
        ...activity,
        date: new Date().toISOString()
      };
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'activities'), activityData);

      // Earn points on purchase
      if (activity.type === 'Purchase' && activity.points > 0) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, {
          points: userPoints + activity.points
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}/activities`);
    }
  };

  const handleRewardImageUpload = async (id: string, file: File) => {
    if (auth.currentUser?.email !== 'kopitebbr@gmail.com') return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        await updateDoc(doc(db, 'rewards', id), { image: base64 });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `rewards/${id}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQRUpload = async (file: File) => {
    if (auth.currentUser?.email !== 'kopitebbr@gmail.com') return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        await setDoc(doc(db, 'settings', 'company'), { paymentQR: base64 }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'settings/company');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddReview = async (review: Omit<Review, 'id' | 'date'>) => {
    try {
      const reviewData = {
        ...review,
        date: new Date().toISOString()
      };
      await addDoc(collection(db, 'reviews'), reviewData);
      setIsReviewModalOpen(false);
      
      addActivity({
        type: 'Review',
        title: `Reviewed: ${reviewItem?.name}`,
        amount: 0,
        points: 50 // Reward for review
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reviews');
    }
  };

  const handleRedeemReward = async (reward: Reward) => {
    if (!auth.currentUser) return;
    if (userPoints < reward.points) {
      alert(`You need ${reward.points - userPoints} more points to redeem this reward!`);
      return;
    }

    if (window.confirm(`Redeem ${reward.title} for ${reward.points} points?`)) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          points: userPoints - reward.points
        });
        
        // Track activity
        await addActivity({
          type: 'Redemption',
          title: `Redeemed: ${reward.title}`,
          amount: 0,
          points: reward.points
        });

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FFFFFF']
        });
        alert(`Success! You have redeemed ${reward.title}. Our team will contact you shortly.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const handleImageUpload = async (id: string, file: File) => {
    if (auth.currentUser?.email !== 'kopitebbr@gmail.com') return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        await updateDoc(doc(db, 'fruits', id), { image: base64 });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `fruits/${id}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageReset = async () => {
    if (auth.currentUser?.email !== 'kopitebbr@gmail.com') return;
    if (window.confirm('Revert all fruit images to farm defaults?')) {
      try {
        const batch = writeBatch(db);
        FRUITS_DATA.forEach(f => {
          batch.set(doc(db, 'fruits', f.id), f);
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'fruits');
      }
    }
  };

  const addToCart = (item: Fruit | FitnessPlan | CheckupPackage, directBuy = false) => {
    // Map different item types to a common interface for the cart
    const isPlan = 'level' in item;
    const isTest = 'tests' in item;
    
    const mappedItem: Fruit = {
      id: isPlan ? `plan-${item.id}` : (isTest ? `test-${item.id}` : (item as Fruit).id),
      name: item.name,
      description: item.description || '',
      price: item.price,
      unit: (item as any).unit || (isPlan ? 'Month' : 'Package'),
      image: (item as any).image || (isPlan ? 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300' : 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=300')
    };

    setCart(prev => {
      const existing = prev.find(i => i.id === mappedItem.id);
      if (existing) {
        return prev.map(i => i.id === mappedItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...mappedItem, quantity: 1 }];
    });
    setShouldAutoCheckout(directBuy);
    setIsCartOpen(true);
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Loading FreshVita...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-green-100 selection:text-green-900 pb-16 md:pb-0">
      <Navbar 
        onOpenCart={() => setIsCartOpen(true)} 
        cartCount={cartCount} 
        points={userPoints} 
        user={currentUser}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={() => signOut(auth)}
      />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      <AnimatePresence>
        {isAdminModalOpen && (
          <EditItemModal 
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            type={adminType}
            item={adminItem}
            onSave={async (data) => {
              if (adminType === 'fruit') {
                try {
                  await setDoc(doc(db, 'fruits', data.id), data, { merge: true });
                  setIsAdminModalOpen(false);
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, `fruits/${data.id}`);
                }
              } else {
                try {
                  await setDoc(doc(db, 'rewards', data.id), data, { merge: true });
                  setIsAdminModalOpen(false);
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, `rewards/${data.id}`);
                }
              }
            }}
          />
        )}
      </AnimatePresence>
      <main>
        <Hero />
        <FruitSection 
          fruits={fruits} 
          onImageUpload={handleImageUpload} 
          onReset={handleImageReset}
          onAddToCart={addToCart}
          reviews={reviews}
          onRate={(id, name) => {
            setReviewItem({ id, name });
            setIsReviewModalOpen(true);
          }}
          user={currentUser}
          onEdit={(fruit) => {
            setAdminItem(fruit);
            setAdminType('fruit');
            setIsAdminModalOpen(true);
          }}
          onAdd={() => {
            setAdminItem(null);
            setAdminType('fruit');
            setIsAdminModalOpen(true);
          }}
        />
        <FitnessSection onAddToCart={addToCart} />
        <CheckupsSection 
          onAddToCart={addToCart}
          reviews={reviews}
          onRate={(id, name) => {
            setReviewItem({ id, name });
            setIsReviewModalOpen(true);
          }}
        />
        <ReportsSection />
        <RewardsSection 
          rewards={rewards} 
          points={userPoints} 
          onRedeem={handleRedeemReward}
          onImageUpload={handleRewardImageUpload}
          user={currentUser}
          onEdit={(reward) => {
            setAdminItem(reward);
            setAdminType('reward');
            setIsAdminModalOpen(true);
          }}
          onAdd={() => {
            setAdminItem(null);
            setAdminType('reward');
            setIsAdminModalOpen(true);
          }}
        />
        <ActivitySection 
          activities={activities} 
          onRate={(id, name) => {
            setReviewItem({ id, name });
            setIsReviewModalOpen(true);
          }}
        />
        <FAQSection />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
      
      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/9779840687207" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[80] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group flex items-center gap-3 active:bg-[#128C7E]"
      >
        <span className="max-w-0 overflow-hidden group-hover:max-w-[200px] transition-all duration-500 whitespace-nowrap text-sm font-black uppercase tracking-widest pl-2">
          Chat with us
        </span>
        <MessageCircle size={28} className="fill-white" />
        <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20 -z-10 group-hover:hidden" />
      </a>

      <BottomNav 
        onOpenCart={() => setIsCartOpen(true)} 
        cartCount={cartCount} 
        user={currentUser}
        onSignIn={() => setIsAuthModalOpen(true)}
      />

      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
            />
            <CartSidebar 
              cart={cart}
              selectedZoneId={selectedZoneId}
              onZoneChange={setSelectedZoneId}
              onClose={() => {
                setIsCartOpen(false);
                setShouldAutoCheckout(false);
              }}
              onUpdateQty={updateCartQty}
              onRemove={removeFromCart}
              onClearCart={() => setCart([])}
              paymentQR={paymentQR}
              onQRUpload={handleQRUpload}
              onAddActivity={addActivity}
              user={currentUser}
              autoCheckout={shouldAutoCheckout}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

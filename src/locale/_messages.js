// Statically import all translation JSON files so the bundler includes them
// This ensures translations are available in production (Vercel) where
// reading from the filesystem at runtime may not work in serverless/edge.

// Common translations (shared across frontend and backend)
import Common_en from './messages/en/Common.json';
import Common_es from './messages/es/Common.json';
import Common_fr from './messages/fr/Common.json';
import Common_pt from './messages/pt/Common.json';
// Auth translations
import Auth_en from './messages/en/Auth.json';
import Auth_es from './messages/es/Auth.json';
import Auth_fr from './messages/fr/Auth.json';
import Auth_pt from './messages/pt/Auth.json';
// Frontend translations
import Cart_en from './messages/en/Cart.json';
import Checkout_en from './messages/en/Checkout.json';
import GDPR_en from './messages/en/GDPR.json'; 
import Shop_en from './messages/en/Shop.json';
import Cart_es from './messages/es/Cart.json';
import Checkout_es from './messages/es/Checkout.json';
import GDPR_es from './messages/es/GDPR.json';
import Shop_es from './messages/es/Shop.json';
import Cart_fr from './messages/fr/Cart.json';
import Checkout_fr from './messages/fr/Checkout.json';
import GDPR_fr from './messages/fr/GDPR.json'; 
import Shop_fr from './messages/fr/Shop.json';
import Cart_pt from './messages/pt/Cart.json';
import Checkout_pt from './messages/pt/Checkout.json';
import GDPR_pt from './messages/pt/GDPR.json'; 
import Shop_pt from './messages/pt/Shop.json';

// Backend (Admin) translations
import Admin_en from './messages/en/Admin.json';
import Admin_es from './messages/es/Admin.json';
import Admin_fr from './messages/fr/Admin.json';
import Admin_pt from './messages/pt/Admin.json';

function mergeFiles(...files) {
    return Object.assign({}, ...files.filter(Boolean));
}

const frontend = {
    en: mergeFiles(Common_en, Cart_en, Checkout_en, GDPR_en, Shop_en, Auth_en, Admin_en),
    es: mergeFiles(Common_es, Cart_es, Checkout_es, GDPR_es, Shop_es, Auth_es, Admin_es),
    fr: mergeFiles(Common_fr, Cart_fr, Checkout_fr, GDPR_fr, Shop_fr, Auth_fr, Admin_fr),
    pt: mergeFiles(Common_pt, Cart_pt, Checkout_pt, GDPR_pt, Shop_pt, Auth_pt, Admin_pt)
};

const auth = {
    en: mergeFiles(Common_en, Auth_en),
    es: mergeFiles(Common_es, Auth_es),
    fr: mergeFiles(Common_fr, Auth_fr),
    pt: mergeFiles(Common_pt, Auth_pt)
};

const admin = {
    en: mergeFiles(Common_en, Admin_en),
    es: mergeFiles(Common_es, Admin_es),
    fr: mergeFiles(Common_fr, Admin_fr),   
    pt: mergeFiles(Common_pt, Admin_pt)
};

export function getBundledTranslations(locale) {
    // Always start with frontend as base (common components, shared UI)
    return { ...(frontend[locale] || {}), ...(auth[locale] || {}), ...(admin[locale] || {}) };
}

// For backwards compatibility
export default frontend;

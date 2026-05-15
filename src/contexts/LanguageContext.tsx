"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "hi";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  "Image": { en: "Image", hi: "इमेज" },
  "Video": { en: "Video", hi: "वीडियो" },
  "Combine": { en: "Combine", hi: "कंबाइन" },
  "Pricing": { en: "Pricing", hi: "मूल्य निर्धारण" },
  "Upload Design": { en: "Upload Design", hi: "डिज़ाइन अपलोड करें" },
  "Generate For": { en: "Generate For", hi: "इसके लिए जनरेट करें" },
  "Saree": { en: "Saree", hi: "साड़ी" },
  "Lehenga": { en: "Lehenga", hi: "लहंगा" },
  "Kurti": { en: "Kurti", hi: "कुर्ती" },
  "Salwar Suit": { en: "Salwar Suit", hi: "सलवार सूट" },
  "Man's Kurta": { en: "Man's Kurta", hi: "मेंस कुर्ता" },
  "Men's Dress": { en: "Men's Dress", hi: "मेंस ड्रेस" },
  "Women's Dress": { en: "Women's Dress", hi: "विमेंस ड्रेस" },
  "Stole": { en: "Stole", hi: "स्टोल" },
  "Men's Innerwear": { en: "Men's Innerwear", hi: "मेंस इनरवियर" },
  "Women's Innerwear": { en: "Women's Innerwear", hi: "विमेंस इनरवियर" },
  "Jewelry": { en: "Jewelry", hi: "ज्वेलरी" },
  "More": { en: "More", hi: "और" },
  "Top Design": { en: "Top Design", hi: "टॉप डिज़ाइन" },
  "Bottom Design (Optional)": { en: "Bottom Design (Optional)", hi: "बॉटम डिज़ाइन (वैकल्पिक)" },
  "Click to upload multiple files or drag & drop": { en: "Click to upload multiple files or drag & drop", hi: "कई फ़ाइलें अपलोड करने के लिए क्लिक करें या ड्रैग & ड्रॉप करें" },
  "Batch processing supported": { en: "Batch processing supported", hi: "बैच प्रोसेसिंग समर्थित" },
  "Click to upload a file or drag & drop": { en: "Click to upload a file or drag & drop", hi: "फ़ाइल अपलोड करने के लिए क्लिक करें या ड्रैग & ड्रॉप करें" },
  "Upload an image like this": { en: "Upload an image like this", hi: "इस तरह की इमेज अपलोड करें" },
  "Generate": { en: "Generate", hi: "जेनरेट" },
  "History": { en: "History", hi: "हिस्ट्री" },
  "No content generated yet": { en: "No content generated yet", hi: "अभी तक कोई कंटेंट जेनरेट नहीं हुआ" },
  "Upload your design and click Generate Images or Generate Video.": { en: "Upload your design and click Generate Images or Generate Video.", hi: "अपना डिज़ाइन अपलोड करें और इमेज जेनरेट करें या वीडियो जेनरेट करें पर क्लिक करें।" },
  "No history yet": { en: "No history yet", hi: "अभी तक कोई हिस्ट्री नहीं" },
  "Your generated images will appear here": { en: "Your generated images will appear here", hi: "आपकी जेनरेट की गई इमेज यहां दिखाई देंगी" },
  "Help": { en: "Help", hi: "मदद" },
  "Install": { en: "Install", hi: "इंस्टॉल" },
  "Generate Images": { en: "Generate Images", hi: "इमेज जेनरेट करें" },
  "Image Generation": { en: "Image Generation", hi: "Image Generation" },
  "1 credit": { en: "1 credit", hi: "1 credit" },
  "/ image": { en: "/ image", hi: "/ image" },
  "Video Generation (up to 45s)": { en: "Video Generation (up to 45s)", hi: "Video Generation (up to 45s)" },
  "/ second": { en: "/ second", hi: "/ second" },
  "pricing_desc_1": { en: "Credits are deducted at generation time. Downloads are free!", hi: "जेनरेशन के समय क्रेडिट काटे जाते हैं। डाउनलोड मुफ्त हैं!" },
  "pricing_desc_2": { en: "AI results may vary. Typically 8 out of 10 images match your design accurately. Use regenerate to improve any result.", hi: "AI परिणाम भिन्न हो सकते हैं। आमतौर पर 10 में से 8 इमेज आपके डिज़ाइन से सही मेल खाती हैं। किसी भी परिणाम को बेहतर बनाने के लिए रीजेनरेट का उपयोग करें।" },
  "Buy Credits": { en: "Buy Credits", hi: "क्रेडिट खरीदें" },
  "Select a package": { en: "Select a package", hi: "पैकेज चुनें" },
  "1 credit per image · 1 credit per second (video)": { en: "1 credit per image · 1 credit per second (video)", hi: "1 क्रेडिट प्रति इमेज · 1 क्रेडिट प्रति सेकंड (वीडियो)" },
  "Free Generation": { en: "Free Generation", hi: "मुफ्त जनरेशन" },
  "Special User": { en: "Special User", hi: "विशेष उपयोगकर्ता" },
  "Priority Support": { en: "Priority Support", hi: "प्राथमिकता सहायता" },
  "bonus credits": { en: "bonus credits", hi: "बोनस क्रेडिट" },
  "What you can generate": { en: "What you can generate", hi: "आप क्या बना सकते हैं" },
  "images or": { en: "images or", hi: "इमेज या" },
  "seconds of video": { en: "seconds of video", hi: "सेकंड का वीडियो" },
  "Buy": { en: "Buy", hi: "खरीदें" },
  "Credits for ₹": { en: "Credits for ₹", hi: "क्रेडिट ₹ के लिए" },
  "Secure payment powered by Razorpay": { en: "Secure payment powered by Razorpay", hi: "रेजरपे द्वारा सुरक्षित भुगतान" },
  "credits": { en: "credits", hi: "क्रेडिट" },
  "Add Blouse / Dupatta / Pallu Design": { en: "Add Blouse / Dupatta / Pallu Design", hi: "ब्लाउज / दुपट्टा / पल्लू डिज़ाइन जोड़ें" },
  "Close-Up Design Reference": { en: "Close-Up Design Reference", hi: "क्लोज-अप डिज़ाइन संदर्भ" },
  "Catalogue Options": { en: "Catalogue Options", hi: "कैटलॉग विकल्प" },
  "Model, Background & Pose Options": { en: "Model, Background & Pose Options", hi: "मॉडल, बैकग्राउंड और पोज़ विकल्प" },
  "Branding Details": { en: "Branding Details", hi: "ब्रांडिंग विवरण" },
  "AI Instructions": { en: "AI Instructions", hi: "AI निर्देश" },
  "Example Videos": { en: "Example Videos", hi: "उदाहरण वीडियो" },
  "See what you can create": { en: "See what you can create", hi: "देखें कि आप क्या बना सकते हैं" },
  "Blouse Design": { en: "Blouse Design", hi: "ब्लाउज डिज़ाइन" },
  "Dupatta Design": { en: "Dupatta Design", hi: "दुपट्टा डिज़ाइन" },
  "Pallu/Drape Design": { en: "Pallu/Drape Design", hi: "पल्लू/ड्रेप डिज़ाइन" },
  "(Optional)": { en: "(Optional)", hi: "(वैकल्पिक)" },
  "Upload a blouse reference to match its design, color, and pattern in the generated image.": { en: "Upload a blouse reference to match its design, color, and pattern in the generated image.", hi: "उत्पन्न छवि में इसके डिज़ाइन, रंग और पैटर्न से मेल खाने के लिए एक ब्लाउज संदर्भ अपलोड करें।" },
  "Upload a dupatta reference to match its design, color, and pattern in the generated image.": { en: "Upload a dupatta reference to match its design, color, and pattern in the generated image.", hi: "उत्पन्न छवि में इसके डिज़ाइन, रंग और पैटर्न से मेल खाने के लिए एक दुपट्टा संदर्भ अपलोड करें।" },
  "Upload a pallu reference to match its design, color, and pattern in the generated image.": { en: "Upload a pallu reference to match its design, color, and pattern in the generated image.", hi: "उत्पन्न छवि में इसके डिज़ाइन, रंग और पैटर्न से मेल खाने के लिए एक पल्लू संदर्भ अपलोड करें।" },
  "Upload a close-up shot of the design to accurately generate the relevant details and texture on the apparel.": { en: "Upload a close-up shot of the design to accurately generate the relevant details and texture on the apparel.", hi: "परिधान पर प्रासंगिक विवरण और बनावट को सटीक रूप से उत्पन्न करने के लिए डिज़ाइन का क्लोज-अप शॉट अपलोड करें।" },
  "Colour Matching": { en: "Colour Matching", hi: "रंग मिलान" },
  "Upload a photo of matching colours options": { en: "Upload a photo of matching colours options", hi: "मेल खाने वाले रंगों के विकल्पों की एक तस्वीर अपलोड करें" },
  "Show them on a display rack on the side": { en: "Show them on a display rack on the side", hi: "उन्हें किनारे पर एक डिस्प्ले रैक पर दिखाएं" },
  "Create a catalogue image with multiple models": { en: "Create a catalogue image with multiple models", hi: "कई मॉडलों के साथ एक कैटलॉग छवि बनाएं" },
  "Model Photography": { en: "Model Photography", hi: "मॉडल फोटोग्राफी" },
  "Flat Lay Photography": { en: "Flat Lay Photography", hi: "फ्लैट ले फोटोग्राफी" },
  "Model and Background": { en: "Model and Background", hi: "मॉडल और बैकग्राउंड" },
  "Upload a photo of a specific model or background to copy their look, lighting, and face.": { en: "Upload a photo of a specific model or background to copy their look, lighting, and face.", hi: "उनके रूप, प्रकाश व्यवस्था और चेहरे की नकल करने के लिए किसी विशिष्ट मॉडल या पृष्ठभूमि की तस्वीर अपलोड करें।" },
  "Pose(s)": { en: "Pose(s)", hi: "पोज़" },
  "Select poses from prompt / image library": { en: "Select poses from prompt / image library", hi: "प्रॉम्प्ट / इमेज लाइब्रेरी से पोज़ चुनें" },
  "Brand Logo": { en: "Brand Logo", hi: "ब्रांड लोगो" },
  "Add brand logo as center watermark": { en: "Add brand logo as center watermark", hi: "केंद्र वॉटरमार्क के रूप में ब्रांड लोगो जोड़ें" },
  "Places a faint brand logo in the center of the image (requires brand logo upload).": { en: "Places a faint brand logo in the center of the image (requires brand logo upload).", hi: "छवि के केंद्र में एक हल्का ब्रांड लोगो रखता है (ब्रांड लोगो अपलोड की आवश्यकता है)।" },
  "Brand Name": { en: "Brand Name", hi: "ब्रांड का नाम" },
  "e.g. Royal Silks": { en: "e.g. Royal Silks", hi: "उदा. रॉयल सिल्क्स" },
  "Design Number": { en: "Design Number", hi: "डिज़ाइन नंबर" },
  "e.g. RS-2024-001": { en: "e.g. RS-2024-001", hi: "उदा. RS-2024-001" },
  "Optimise for Ecommerce Upload": { en: "Optimise for Ecommerce Upload", hi: "ईकॉमर्स अपलोड के लिए अनुकूलित करें" },
  "Automatically sets 1K resolution, Portrait (3:4) aspect ratio, and JPEG format.": { en: "Automatically sets 1K resolution, Portrait (3:4) aspect ratio, and JPEG format.", hi: "स्वचालित रूप से 1K रिज़ॉल्यूशन, पोर्ट्रेट (3:4) पहलू अनुपात और JPEG प्रारूप सेट करता है।" },
  "Output Format": { en: "Output Format", hi: "आउटपुट स्वरूप" },
  "PNG": { en: "PNG", hi: "PNG" },
  "JPEG": { en: "JPEG", hi: "JPEG" },
  "Edit / Style Prompt": { en: "Edit / Style Prompt", hi: "संपादित करें / शैली प्रॉम्प्ट" },
  "Aspect Ratio": { en: "Aspect Ratio", hi: "पहलू अनुपात" },
  "Resolution": { en: "Resolution", hi: "रिज़ॉल्यूशन" },
  "2:3 - Tall Portrait (4:6, 6:9,": { en: "2:3 - Tall Portrait (4:6, 6:9,", hi: "2:3 - टॉल पोर्ट्रेट (4:6, 6:9," },
  "Pose Prompt Library": { en: "Pose Prompt Library", hi: "पोज़ प्रॉम्प्ट लाइब्रेरी" },
  "Pose Image Library": { en: "Pose Image Library", hi: "पोज़ इमेज लाइब्रेरी" },
  "Number of Poses": { en: "Number of Poses", hi: "पोज़ की संख्या" },
  "Edit Pose Prompts": { en: "Edit Pose Prompts", hi: "पोज़ प्रॉम्प्ट संपादित करें" },
  "Customise the text description for each pose. Click a pose to expand and edit.": { en: "Customise the text description for each pose. Click a pose to expand and edit.", hi: "प्रत्येक पोज़ के लिए टेक्स्ट विवरण कस्टमाइज़ करें। विस्तार करने और संपादित करने के लिए किसी पोज़ पर क्लिक करें।" },
  "Reset to Default": { en: "Reset to Default", hi: "डिफ़ॉल्ट पर रीसेट करें" },
  "Pose 1: Front Standing": { en: "Pose 1: Front Standing", hi: "पोज़ 1: सामने खड़े होना" },
  "Pose 2: Left Profile": { en: "Pose 2: Left Profile", hi: "पोज़ 2: बायां प्रोफ़ाइल" },
  "Pose 3: Back View": { en: "Pose 3: Back View", hi: "पोज़ 3: पीछे का दृश्य" },
  "Pose 4: Leaning on Wall": { en: "Pose 4: Leaning on Wall", hi: "पोज़ 4: दीवार पर झुकाव" },
  "Pose 5: Seated": { en: "Pose 5: Seated", hi: "पोज़ 5: बैठे हुए" },
  "Pose 6: Walking": { en: "Pose 6: Walking", hi: "पोज़ 6: चलना" },
  "Pose 7: Close-up Portrait": { en: "Pose 7: Close-up Portrait", hi: "पोज़ 7: क्लोज़-अप पोर्ट्रेट" },
  "Pose 8: Right Profile": { en: "Pose 8: Right Profile", hi: "पोज़ 8: दायां प्रोफ़ाइल" },
  "Select Poses": { en: "Select Poses", hi: "पोज़ चुनें" },
  "Selected": { en: "Selected", hi: "चयनित" },
  "Please select at least one pose": { en: "Please select at least one pose", hi: "कृपया कम से कम एक पोज़ चुनें" },
  "Flat Lay Style Reference": { en: "Flat Lay Style Reference", hi: "फ्लैट ले स्टाइल संदर्भ" },
  "Upload a photo showing the surface, lighting, and styling you want for your flat lay (e.g. marble table, wooden surface). Optional.": { en: "Upload a photo showing the surface, lighting, and styling you want for your flat lay (e.g. marble table, wooden surface). Optional.", hi: "अपनी फ्लैट ले के लिए आप जो सतह, प्रकाश व्यवस्था और स्टाइल चाहते हैं, उसे दिखाने वाली एक तस्वीर अपलोड करें (उदा. संगमरमर की मेज, लकड़ी की सतह)। वैकल्पिक।" },
  "Font Style": { en: "Font Style", hi: "फ़ॉन्ट शैली" },
  "Size:": { en: "Size:", hi: "आकार:" },
  "Bold": { en: "Bold", hi: "बोल्ड" },
  "Color:": { en: "Color:", hi: "रंग:" },
  "Text Position": { en: "Text Position", hi: "टेक्स्ट स्थिति" },
  "Top Left": { en: "Top Left", hi: "ऊपर बाएँ" },
  "Top Right": { en: "Top Right", hi: "ऊपर दाएँ" },
  "Bottom Left": { en: "Bottom Left", hi: "नीचे बाएँ" },
  "Bottom Right": { en: "Bottom Right", hi: "नीचे दाएँ" },
  "3:4 - Portrait": { en: "3:4 - Portrait", hi: "3:4 - पोर्ट्रेट" },
  "4:3 - Landscape": { en: "4:3 - Landscape", hi: "4:3 - लैंडस्केप" },
  "1:1 - Square": { en: "1:1 - Square", hi: "1:1 - वर्गाकार" },
  "2:3 - Tall Portrait (4:6, 6:9, Default)": { en: "2:3 - Tall Portrait (4:6, 6:9, Default)", hi: "2:3 - लंबा पोर्ट्रेट (4:6, 6:9, डिफ़ॉल्ट)" },
  "3:2 - Wide Landscape": { en: "3:2 - Wide Landscape", hi: "3:2 - चौड़ा लैंडस्केप" },
  "9:16 - Phone/Stories": { en: "9:16 - Phone/Stories", hi: "9:16 - फोन/स्टोरीज" },
  "16:9 - Widescreen": { en: "16:9 - Widescreen", hi: "16:9 - वाइडस्क्रीन" },
  "4:5 - Instagram Portrait": { en: "4:5 - Instagram Portrait", hi: "4:5 - इंस्टाग्राम पोर्ट्रेट" },
  "5:4 - Instagram Landscape": { en: "5:4 - Instagram Landscape", hi: "5:4 - इंस्टाग्राम लैंडस्केप" },
  "1K": { en: "1K", hi: "1K" },
  "2K": { en: "2K", hi: "2K" },
  "4K": { en: "4K", hi: "4K" }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "hi" : "en"));
  };

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language];
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

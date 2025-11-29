"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { X, Upload, Globe2, MapPin, ChevronDown, Search } from "lucide-react";
import toast from "react-hot-toast";

interface ComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onPosted?: () => void;
  attachTripId?: string | null;
}

// Import countries from WorldMapFilter
const countries = [
  { code: "AD", name: "Andorra", region: "Europe" },
  { code: "AL", name: "Albania", region: "Europe" },
  { code: "AT", name: "Austria", region: "Europe" },
  { code: "BA", name: "Bosnia and Herzegovina", region: "Europe" },
  { code: "BE", name: "Belgium", region: "Europe" },
  { code: "BG", name: "Bulgaria", region: "Europe" },
  { code: "BY", name: "Belarus", region: "Europe" },
  { code: "CH", name: "Switzerland", region: "Europe" },
  { code: "CY", name: "Cyprus", region: "Europe" },
  { code: "CZ", name: "Czechia", region: "Europe" },
  { code: "DE", name: "Germany", region: "Europe" },
  { code: "DK", name: "Denmark", region: "Europe" },
  { code: "EE", name: "Estonia", region: "Europe" },
  { code: "ES", name: "Spain", region: "Europe" },
  { code: "FI", name: "Finland", region: "Europe" },
  { code: "FR", name: "France", region: "Europe" },
  { code: "GB", name: "United Kingdom", region: "Europe" },
  { code: "GR", name: "Greece", region: "Europe" },
  { code: "HR", name: "Croatia", region: "Europe" },
  { code: "HU", name: "Hungary", region: "Europe" },
  { code: "IE", name: "Ireland", region: "Europe" },
  { code: "IS", name: "Iceland", region: "Europe" },
  { code: "IT", name: "Italy", region: "Europe" },
  { code: "LI", name: "Liechtenstein", region: "Europe" },
  { code: "LT", name: "Lithuania", region: "Europe" },
  { code: "LU", name: "Luxembourg", region: "Europe" },
  { code: "LV", name: "Latvia", region: "Europe" },
  { code: "MC", name: "Monaco", region: "Europe" },
  { code: "MD", name: "Moldova", region: "Europe" },
  { code: "ME", name: "Montenegro", region: "Europe" },
  { code: "MK", name: "North Macedonia", region: "Europe" },
  { code: "MT", name: "Malta", region: "Europe" },
  { code: "NL", name: "Netherlands", region: "Europe" },
  { code: "NO", name: "Norway", region: "Europe" },
  { code: "PL", name: "Poland", region: "Europe" },
  { code: "PT", name: "Portugal", region: "Europe" },
  { code: "RO", name: "Romania", region: "Europe" },
  { code: "RS", name: "Serbia", region: "Europe" },
  { code: "RU", name: "Russia", region: "Europe" },
  { code: "SE", name: "Sweden", region: "Europe" },
  { code: "SI", name: "Slovenia", region: "Europe" },
  { code: "SK", name: "Slovakia", region: "Europe" },
  { code: "SM", name: "San Marino", region: "Europe" },
  { code: "TR", name: "Turkey", region: "Europe" },
  { code: "UA", name: "Ukraine", region: "Europe" },
  { code: "VA", name: "Vatican City", region: "Europe" },
  { code: "AF", name: "Afghanistan", region: "Asia" },
  { code: "AM", name: "Armenia", region: "Asia" },
  { code: "AZ", name: "Azerbaijan", region: "Asia" },
  { code: "BD", name: "Bangladesh", region: "Asia" },
  { code: "BT", name: "Bhutan", region: "Asia" },
  { code: "BN", name: "Brunei", region: "Asia" },
  { code: "CN", name: "China", region: "Asia" },
  { code: "GE", name: "Georgia", region: "Asia" },
  { code: "ID", name: "Indonesia", region: "Asia" },
  { code: "IN", name: "India", region: "Asia" },
  { code: "JP", name: "Japan", region: "Asia" },
  { code: "KG", name: "Kyrgyzstan", region: "Asia" },
  { code: "KH", name: "Cambodia", region: "Asia" },
  { code: "KP", name: "North Korea", region: "Asia" },
  { code: "KR", name: "South Korea", region: "Asia" },
  { code: "KZ", name: "Kazakhstan", region: "Asia" },
  { code: "LA", name: "Laos", region: "Asia" },
  { code: "LK", name: "Sri Lanka", region: "Asia" },
  { code: "MM", name: "Myanmar", region: "Asia" },
  { code: "MN", name: "Mongolia", region: "Asia" },
  { code: "MY", name: "Malaysia", region: "Asia" },
  { code: "NP", name: "Nepal", region: "Asia" },
  { code: "PG", name: "Papua New Guinea", region: "Asia" },
  { code: "PH", name: "Philippines", region: "Asia" },
  { code: "PK", name: "Pakistan", region: "Asia" },
  { code: "SG", name: "Singapore", region: "Asia" },
  { code: "TH", name: "Thailand", region: "Asia" },
  { code: "TJ", name: "Tajikistan", region: "Asia" },
  { code: "TL", name: "Timor-Leste", region: "Asia" },
  { code: "TM", name: "Turkmenistan", region: "Asia" },
  { code: "TW", name: "Taiwan", region: "Asia" },
  { code: "UZ", name: "Uzbekistan", region: "Asia" },
  { code: "VN", name: "Vietnam", region: "Asia" },
  { code: "MV", name: "Maldives", region: "Asia" },
  { code: "AE", name: "United Arab Emirates", region: "Middle East" },
  { code: "BH", name: "Bahrain", region: "Middle East" },
  { code: "IL", name: "Israel", region: "Middle East" },
  { code: "IQ", name: "Iraq", region: "Middle East" },
  { code: "IR", name: "Iran", region: "Middle East" },
  { code: "JO", name: "Jordan", region: "Middle East" },
  { code: "KW", name: "Kuwait", region: "Middle East" },
  { code: "LB", name: "Lebanon", region: "Middle East" },
  { code: "OM", name: "Oman", region: "Middle East" },
  { code: "QA", name: "Qatar", region: "Middle East" },
  { code: "SA", name: "Saudi Arabia", region: "Middle East" },
  { code: "SY", name: "Syria", region: "Middle East" },
  { code: "YE", name: "Yemen", region: "Middle East" },
  { code: "AO", name: "Angola", region: "Africa" },
  { code: "BF", name: "Burkina Faso", region: "Africa" },
  { code: "BI", name: "Burundi", region: "Africa" },
  { code: "BJ", name: "Benin", region: "Africa" },
  { code: "BW", name: "Botswana", region: "Africa" },
  { code: "CD", name: "DR Congo", region: "Africa" },
  { code: "CF", name: "Central African Republic", region: "Africa" },
  { code: "CG", name: "Republic of the Congo", region: "Africa" },
  { code: "CI", name: "Côte d'Ivoire", region: "Africa" },
  { code: "CM", name: "Cameroon", region: "Africa" },
  { code: "CV", name: "Cape Verde", region: "Africa" },
  { code: "DJ", name: "Djibouti", region: "Africa" },
  { code: "DZ", name: "Algeria", region: "Africa" },
  { code: "EG", name: "Egypt", region: "Africa" },
  { code: "ER", name: "Eritrea", region: "Africa" },
  { code: "ET", name: "Ethiopia", region: "Africa" },
  { code: "GA", name: "Gabon", region: "Africa" },
  { code: "GH", name: "Ghana", region: "Africa" },
  { code: "GM", name: "Gambia", region: "Africa" },
  { code: "GN", name: "Guinea", region: "Africa" },
  { code: "GQ", name: "Equatorial Guinea", region: "Africa" },
  { code: "GW", name: "Guinea-Bissau", region: "Africa" },
  { code: "KE", name: "Kenya", region: "Africa" },
  { code: "KM", name: "Comoros", region: "Africa" },
  { code: "LR", name: "Liberia", region: "Africa" },
  { code: "LS", name: "Lesotho", region: "Africa" },
  { code: "LY", name: "Libya", region: "Africa" },
  { code: "MA", name: "Morocco", region: "Africa" },
  { code: "MG", name: "Madagascar", region: "Africa" },
  { code: "ML", name: "Mali", region: "Africa" },
  { code: "MR", name: "Mauritania", region: "Africa" },
  { code: "MU", name: "Mauritius", region: "Africa" },
  { code: "MW", name: "Malawi", region: "Africa" },
  { code: "MZ", name: "Mozambique", region: "Africa" },
  { code: "NA", name: "Namibia", region: "Africa" },
  { code: "NE", name: "Niger", region: "Africa" },
  { code: "NG", name: "Nigeria", region: "Africa" },
  { code: "RW", name: "Rwanda", region: "Africa" },
  { code: "SC", name: "Seychelles", region: "Africa" },
  { code: "SD", name: "Sudan", region: "Africa" },
  { code: "SL", name: "Sierra Leone", region: "Africa" },
  { code: "SN", name: "Senegal", region: "Africa" },
  { code: "SO", name: "Somalia", region: "Africa" },
  { code: "SS", name: "South Sudan", region: "Africa" },
  { code: "SZ", name: "Eswatini", region: "Africa" },
  { code: "TD", name: "Chad", region: "Africa" },
  { code: "TG", name: "Togo", region: "Africa" },
  { code: "TN", name: "Tunisia", region: "Africa" },
  { code: "TZ", name: "Tanzania", region: "Africa" },
  { code: "UG", name: "Uganda", region: "Africa" },
  { code: "ZA", name: "South Africa", region: "Africa" },
  { code: "ZM", name: "Zambia", region: "Africa" },
  { code: "ZW", name: "Zimbabwe", region: "Africa" },
  { code: "ST", name: "São Tomé and Príncipe", region: "Africa" },
  { code: "CA", name: "Canada", region: "North America" },
  { code: "MX", name: "Mexico", region: "North America" },
  { code: "US", name: "United States", region: "North America" },
  { code: "AG", name: "Antigua and Barbuda", region: "Central America & Caribbean" },
  { code: "BB", name: "Barbados", region: "Central America & Caribbean" },
  { code: "BS", name: "Bahamas", region: "Central America & Caribbean" },
  { code: "BZ", name: "Belize", region: "Central America & Caribbean" },
  { code: "CR", name: "Costa Rica", region: "Central America & Caribbean" },
  { code: "CU", name: "Cuba", region: "Central America & Caribbean" },
  { code: "DM", name: "Dominica", region: "Central America & Caribbean" },
  { code: "DO", name: "Dominican Republic", region: "Central America & Caribbean" },
  { code: "GD", name: "Grenada", region: "Central America & Caribbean" },
  { code: "GT", name: "Guatemala", region: "Central America & Caribbean" },
  { code: "HN", name: "Honduras", region: "Central America & Caribbean" },
  { code: "HT", name: "Haiti", region: "Central America & Caribbean" },
  { code: "JM", name: "Jamaica", region: "Central America & Caribbean" },
  { code: "KN", name: "Saint Kitts and Nevis", region: "Central America & Caribbean" },
  { code: "LC", name: "Saint Lucia", region: "Central America & Caribbean" },
  { code: "NI", name: "Nicaragua", region: "Central America & Caribbean" },
  { code: "PA", name: "Panama", region: "Central America & Caribbean" },
  { code: "SV", name: "El Salvador", region: "Central America & Caribbean" },
  { code: "TT", name: "Trinidad and Tobago", region: "Central America & Caribbean" },
  { code: "VC", name: "Saint Vincent and the Grenadines", region: "Central America & Caribbean" },
  { code: "AR", name: "Argentina", region: "South America" },
  { code: "BO", name: "Bolivia", region: "South America" },
  { code: "BR", name: "Brazil", region: "South America" },
  { code: "CL", name: "Chile", region: "South America" },
  { code: "CO", name: "Colombia", region: "South America" },
  { code: "EC", name: "Ecuador", region: "South America" },
  { code: "GY", name: "Guyana", region: "South America" },
  { code: "PY", name: "Paraguay", region: "South America" },
  { code: "PE", name: "Peru", region: "South America" },
  { code: "SR", name: "Suriname", region: "South America" },
  { code: "UY", name: "Uruguay", region: "South America" },
  { code: "VE", name: "Venezuela", region: "South America" },
  { code: "AU", name: "Australia", region: "Oceania" },
  { code: "FJ", name: "Fiji", region: "Oceania" },
  { code: "FM", name: "Micronesia", region: "Oceania" },
  { code: "KI", name: "Kiribati", region: "Oceania" },
  { code: "MH", name: "Marshall Islands", region: "Oceania" },
  { code: "NR", name: "Nauru", region: "Oceania" },
  { code: "NZ", name: "New Zealand", region: "Oceania" },
  { code: "PW", name: "Palau", region: "Oceania" },
  { code: "SB", name: "Solomon Islands", region: "Oceania" },
  { code: "TO", name: "Tonga", region: "Oceania" },
  { code: "TV", name: "Tuvalu", region: "Oceania" },
  { code: "VU", name: "Vanuatu", region: "Oceania" },
  { code: "WS", name: "Samoa", region: "Oceania" },
];

export default function PostComposer({ isOpen, onClose, onPosted, attachTripId }: ComposerProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [countryName, setCountryName] = useState<string>("");
  const [trip, setTrip] = useState<any>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract country name from destination (format: "City, Country" or just "Country")
  const extractCountryFromDestination = (destination: string): string => {
    if (!destination) return "";
    const parts = destination.split(',').map(part => part.trim());
    // Return the last part as it's usually the country
    return parts[parts.length - 1] || "";
  };

  // Get country code from country name
  const getCountryCodeFromName = (name: string): string | null => {
    if (!name) return null;
    const country = countries.find(c => c.name === name);
    return country?.code || null;
  };

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries.slice(0, 20); // Show first 20 by default
    const query = countrySearch.toLowerCase();
    return countries.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [countrySearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryDropdown]);

  useEffect(() => {
    if (!isOpen) {
      setContent("");
      setFiles([]);
      setCountryName("");
      setTrip(null);
    } else if (attachTripId) {
      // Load trip details and autofill country
      supabase.from('trips').select('*').eq('id', attachTripId).single().then(({ data }) => {
        if (data) {
          setTrip(data);
          // Autofill country name from destination
          if (data.destination) {
            const extractedCountry = extractCountryFromDestination(data.destination);
            if (extractedCountry) {
              setCountryName(extractedCountry);
            }
          }
        }
      });
    }
  }, [isOpen, attachTripId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) {
      toast.error("Please add content or images to your post");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please log in to create a post");
        return;
      }
      const authorId = userData.user.id;

      // Derive country code from name if possible
      const derivedCountryCode = countryName.trim() ? getCountryCodeFromName(countryName.trim()) : null;

      const { data: postRow, error: postErr } = await supabase
        .from('posts')
        .insert({
          author_id: authorId,
          content: content.trim(),
          country_code: derivedCountryCode, // Derived from country name for flag display
          country_name: countryName.trim() || null,
          trip_id: attachTripId || null,
        })
        .select('*')
        .single();
      
      if (postErr || !postRow) {
        console.error('Post creation error:', postErr);
        toast.error('Failed to create post: ' + (postErr?.message || 'Unknown error'));
        throw postErr;
      }

      // upload images
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Get file extension from original filename
          const originalName = file.name;
          const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
          
          // Create a clean filename using UUID only (no original filename to avoid spaces/special chars)
          const objectPath = `posts/${postRow.id}/${crypto.randomUUID()}.${fileExtension}`;
          
          
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('post-images')
            .upload(objectPath, file, {
              cacheControl: '3600',
              upsert: false,
            });
          
          if (uploadErr) {
            console.error(`Image upload error for ${file.name}:`, uploadErr);
            toast.error(`Failed to upload image: ${uploadErr.message}`);
            throw uploadErr;
          }
          
          
          const { error: insertErr } = await supabase.from('post_images').insert({
            post_id: postRow.id,
            image_path: objectPath,
            order_index: i,
          });
          
          if (insertErr) {
            console.error(`Database insert error for image ${i + 1}:`, insertErr);
            toast.error(`Failed to save image metadata: ${insertErr.message}`);
            // Try to clean up uploaded file
            await supabase.storage.from('post-images').remove([objectPath]);
            throw insertErr;
          }
          
        }
      }

      // Reset form immediately
      setContent("");
      setFiles([]);
      setCountryName("");
      
      // Close dialog first
      onClose();
      
      // Then trigger feed refresh after a brief delay to ensure post is fully saved
      setTimeout(() => {
        onPosted?.();
        toast.success("Post created successfully!");
      }, 300);
    } catch (e: any) {
      console.error('Post compose error:', e);
      if (!e.message || !e.message.includes('toast')) {
        toast.error('Failed to create post: ' + (e?.message || 'Unknown error'));
      }
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{attachTripId ? 'Share Trip' : 'New Post'}</h3>
          <button className="cursor-pointer" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {trip && (
          <div className="mb-3 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="text-sm font-medium text-gray-900">{trip.title}</div>
            {trip.destination && (
              <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {trip.destination}
              </div>
            )}
          </div>
        )}

        <textarea
          className="w-full border border-gray-300 rounded-md p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-[#ff5a58]"
          rows={4}
          placeholder="Share your travel story..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* Country Selector (Optional) */}
        <div className="mb-3 relative" ref={dropdownRef}>
          <label className="text-sm text-gray-700 mb-1 block">Country (Optional)</label>
          <button
            type="button"
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a58] flex items-center justify-between bg-white"
          >
            <span className={countryName ? "text-gray-900" : "text-gray-500"}>
              {countryName || "Select a country (optional)"}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showCountryDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-hidden">
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5a58]"
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-48">
                {filteredCountries.length > 0 ? (
                  <div className="py-1">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          setCountryName(country.name);
                          setShowCountryDropdown(false);
                          setCountrySearch("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <img
                          src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                          alt={country.name}
                          className="w-5 h-5 rounded object-cover flex-shrink-0"
                        />
                        <span className="text-sm text-gray-900">{country.name}</span>
                        {countryName === country.name && (
                          <span className="ml-auto text-[#ff5a58]">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">No countries found</div>
                )}
              </div>
              {countryName && (
                <div className="p-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setCountryName("");
                      setShowCountryDropdown(false);
                      setCountrySearch("");
                    }}
                    className="text-sm text-red-600 hover:text-red-700 w-full text-left px-2 py-1"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <Upload className="w-4 h-4" />
            <span>Upload images</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          </label>
          {files.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">{files.length} image(s) selected</div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-md border" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="px-4 py-2 rounded-md bg-[#ff5a58] text-white disabled:opacity-60" onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}



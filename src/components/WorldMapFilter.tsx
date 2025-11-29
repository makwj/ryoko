"use client";

import { useState, useMemo } from "react";
import { X, Globe, MapPin, Search } from "lucide-react";

interface Country {
  code: string;
  name: string;
  region: string;
}

const regions = ["All", "Europe", "Asia", "Africa", "North America", "South America", "Oceania", "Middle East", "Central America & Caribbean"];

// Complete list of countries with ISO 3166-1 alpha-2 codes and regions
const countries: Country[] = [
  // Europe
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

  // Asia
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

  // Middle East
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

  // Africa
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

  // North America
  { code: "CA", name: "Canada", region: "North America" },
  { code: "MX", name: "Mexico", region: "North America" },
  { code: "US", name: "United States", region: "North America" },

  // Central America & Caribbean
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

  // South America
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

  // Oceania
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
  { code: "ST", name: "São Tomé and Príncipe", region: "Africa" },
  { code: "MV", name: "Maldives", region: "Asia" },
];

export default function WorldMapFilter({ 
  selectedCountry, 
  onSelectCountry 
}: { 
  selectedCountry: string; // This is now country name for filtering
  onSelectCountry: (countryName: string | null) => void; // Now passes country name
}) {
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");

  const getFlagUrl = (code: string) => {
    // Use flagcdn.com with proper format
    return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
  };

  // Find country by name (for display) or by code (fallback)
  const findCountryByName = (name: string): Country | undefined => {
    return countries.find(c => c.name === name || c.code === name);
  };

  const filteredCountries = useMemo(() => {
    let filtered = countries;
    
    // Filter by region
    if (selectedRegion !== "All") {
      filtered = filtered.filter(country => country.region === selectedRegion);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [searchQuery, selectedRegion]);

  // Get selected country info (selectedCountry can be name or code)
  const selectedCountryInfo = useMemo(() => {
    return findCountryByName(selectedCountry);
  }, [selectedCountry]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMap(!showMap)}
        className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition-colors"
      >
        {selectedCountry && selectedCountryInfo ? (
          <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm">
            <img 
              src={getFlagUrl(selectedCountryInfo.code)} 
              alt={selectedCountryInfo.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <Globe className="w-4 h-4 text-gray-600" />
        )}
        <span className="text-sm">
          {selectedCountry ? selectedCountryInfo?.name || selectedCountry : "Filter by country"}
        </span>
        {selectedCountry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectCountry(null);
            }}
            className="ml-2 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {showMap && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMap(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[700px] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2 text-gray-800">
                  <Globe className="w-5 h-5 text-[#ff5a58]" />
                  Select Country to Filter
                </h3>
                <button
                  onClick={() => setShowMap(false)}
                  className="cursor-pointer hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5a58] bg-white"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {/* Region tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {regions.map((region) => (
                  <button
                    key={region}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRegion(region);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedRegion === region
                        ? 'bg-[#ff5a58] text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 bg-white">
              <div className="p-3">
                <button
                  onClick={() => {
                    onSelectCountry(null);
                    setShowMap(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-3 transition-all flex items-center gap-3 ${
                    !selectedCountry
                      ? 'bg-[#ff5a58] text-white shadow-md'
                      : 'hover:bg-gray-50 text-gray-700 border border-gray-200'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="font-medium">All Countries</span>
                </button>
                
                {filteredCountries.length > 0 ? (
                  <>
                    {selectedRegion !== "All" && (
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                        {selectedRegion} ({filteredCountries.length} countries)
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {filteredCountries.map((country) => (
                        <button
                          key={country.code}
                      onClick={() => {
                        onSelectCountry(country.name); // Pass country name instead of code
                        setShowMap(false);
                        setSearchQuery("");
                        setSelectedRegion("All");
                      }}
                      className={`text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                        selectedCountry === country.name || selectedCountry === country.code
                              ? 'bg-[#ff5a58] text-white shadow-md'
                              : 'hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-[#ff5a58]'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm bg-gray-100">
                            <img 
                              src={getFlagUrl(country.code)} 
                              alt={country.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{country.name}</span>
                            <span className={`text-xs ${selectedCountry === country.name || selectedCountry === country.code ? 'opacity-90' : 'text-gray-500'}`}>{country.code}</span>
                          </div>
                          {(selectedCountry === country.name || selectedCountry === country.code) && (
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No countries found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

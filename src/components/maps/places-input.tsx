"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/form";
import { MAPS_API_KEY } from "@/components/maps/maps-provider";

export type PlaceSelection = {
  placeId: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  addressLine1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};

function pick(components: google.maps.places.AddressComponent[] | null | undefined, type: string, short = false) {
  const c = components?.find((x) => x.types.includes(type));
  return c ? (short ? c.shortText : c.longText) ?? undefined : undefined;
}

function toSelection(place: google.maps.places.Place): PlaceSelection | null {
  const loc = place.location;
  if (!loc) return null;
  const comps = place.addressComponents;
  const streetNumber = pick(comps, "street_number");
  const route = pick(comps, "route");
  return {
    placeId: place.id,
    lat: loc.lat(),
    lng: loc.lng(),
    formattedAddress: place.formattedAddress ?? "",
    addressLine1: [streetNumber, route].filter(Boolean).join(" ") || place.displayName || undefined,
    city: pick(comps, "locality") ?? pick(comps, "postal_town") ?? pick(comps, "administrative_area_level_2") ?? pick(comps, "sublocality"),
    region: pick(comps, "administrative_area_level_1"),
    postalCode: pick(comps, "postal_code"),
    country: pick(comps, "country", true),
  };
}

/**
 * Address search box backed by Google Places Autocomplete (new Places API).
 * Renders a plain text input when no Maps key is configured.
 */
export function PlacesInput({
  id,
  placeholder = "Search for an address",
  onSelect,
  types,
}: {
  id?: string;
  placeholder?: string;
  onSelect: (place: PlaceSelection) => void;
  types?: string[];
}) {
  const places = useMapsLibrary("places");
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!places || value.trim().length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        sessionRef.current ??= new places.AutocompleteSessionToken();
        const { suggestions: found } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: sessionRef.current,
          includedPrimaryTypes: types,
        });
        if (!cancelled) {
          setSuggestions(found);
          setOpen(true);
        }
      } catch (error) {
        console.error("places autocomplete failed", error);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [places, value, types]);

  if (!MAPS_API_KEY) {
    return (
      <Input id={id} placeholder="Address search needs a Google Maps key" disabled />
    );
  }

  async function choose(s: google.maps.places.AutocompleteSuggestion) {
    const prediction = s.placePrediction;
    if (!prediction) return;
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["id", "location", "formattedAddress", "addressComponents", "displayName"] });
    sessionRef.current = null;
    setOpen(false);
    setValue(place.formattedAddress ?? prediction.text.text);
    const sel = toSelection(place);
    if (sel) onSelect(sel);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value.trim().length < 3) {
            setSuggestions([]);
            setOpen(false);
          }
        }}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.placePrediction?.placeId ?? i}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
              >
                {s.placePrediction?.text.text}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

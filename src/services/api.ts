// Using Art Institute of Chicago (AIC) API as an example
const AIC_API_URL = 'https://api.artic.edu/api/v1/artworks';

// Define a basic type for the artwork data we expect
// We'll expand this later as needed
export interface Artwork {
  id: number;
  title: string;
  artist_title: string | null;
  image_id: string | null; // Needed to construct image URL
}

// Define the structure of the API response for a list of artworks
interface ApiResponse {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
    next_url: string | null;
  };
  data: Artwork[];
  config: {
    iiif_url: string; // Base URL for images
  };
}

/**
 * Fetches a list of artworks from the AIC API.
 * @param page - The page number to fetch.
 * @param limit - The number of items per page.
 * @returns Promise resolving to the API response structure.
 */
export const getArtworks = async (page: number = 1, limit: number = 10): Promise<ApiResponse> => {
  // Construct the query URL
  // Fetch only public domain artworks with images for now
  // Request specific fields to reduce payload size
  const fields = 'id,title,artist_title,image_id';
  const url = `${AIC_API_URL}?page=${page}&limit=${limit}&fields=${fields}`;
  // Example filter for public domain: &query[term][is_public_domain]=true
  // Example filter for artworks with images: &query[exists][field]=image_id

  console.log(`Fetching artworks from: ${url}`); // For debugging

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ApiResponse = await response.json();
    console.log('Fetched artworks:', data.data.length); // For debugging
    return data;
  } catch (error) {
    console.error("Failed to fetch artworks:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
};

/**
 * Constructs the full image URL for an artwork.
 * @param imageId - The image_id from the artwork data.
 * @param iiifUrl - The base IIIF URL from the API config.
 * @returns The full image URL string.
 */
export const getImageUrl = (imageId: string | null, iiifUrl: string): string | null => {
  if (!imageId || !iiifUrl) {
    return null;
  }
  // Construct the URL using the IIIF standard format
  // Example: {iiif_url}/{image_id}/full/843,/0/default.jpg (requesting max 843px width)
  return `${iiifUrl}/${imageId}/full/400,/0/default.jpg`; // Request a smaller size for list view
};

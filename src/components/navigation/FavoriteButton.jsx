import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function FavoriteButton({ type, id, name }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const favoriteField = type === 'page' ? 'favorited_pages' : 'favorited_patients';
  const favorites = currentUser?.[favoriteField] || [];
  const isFavorited = favorites.some(fav => 
    type === 'page' ? fav === id : fav.id === id
  );

  const toggleFavorite = async () => {
    if (!currentUser || isUpdating) return;
    
    setIsUpdating(true);
    try {
      let newFavorites;
      if (isFavorited) {
        // Remove from favorites
        newFavorites = favorites.filter(fav => 
          type === 'page' ? fav !== id : fav.id !== id
        );
      } else {
        // Add to favorites
        if (type === 'page') {
          newFavorites = [...favorites, id];
        } else {
          newFavorites = [...favorites, { id, name }];
        }
      }

      await base44.auth.updateMe({
        [favoriteField]: newFavorites
      });

      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
    setIsUpdating(false);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleFavorite}
      disabled={isUpdating}
      className="gap-2"
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star className={`w-4 h-4 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
      <span className="hidden md:inline">{isFavorited ? 'Favorited' : 'Favorite'}</span>
    </Button>
  );
}
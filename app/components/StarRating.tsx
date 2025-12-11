import React from 'react';
import { StarIcon } from './Icons';

interface StarRatingProps {
  rating: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
  const totalStars = 5;
  const roundedRating = Math.round(rating);

  return (
    <div className="flex items-center">
      {[...Array(totalStars)].map((_, i) => (
        <StarIcon
          key={i}
          className={`w-4 h-4 ${i < roundedRating ? 'text-amber-400' : 'text-slate-300'}`}
          filled={i < roundedRating}
        />
      ))}
    </div>
  );
};
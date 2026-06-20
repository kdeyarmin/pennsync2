import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Star, Rocket, Zap, Heart, Gift, ChevronRight } from "lucide-react";

const iconMap = {
  sparkles: Sparkles,
  star: Star,
  rocket: Rocket,
  zap: Zap,
  heart: Heart,
  gift: Gift
};

export default function NewFeaturesBanner() {
  const { data: features = [] } = useQuery({
    queryKey: ['newFeatures'],
    queryFn: () => base44.entities.NewFeature.filter({ is_active: true }, '-priority'),
    staleTime: 300000,
  });

  if (features.length === 0) return null;

  return (
    <Card className="bg-gradient-to-r from-indigo-500 via-navy-500 to-gold-500 text-white border-none shadow-xl mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-white" />
          New Features Available! 🎉
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] || Sparkles;
            const content = (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 hover:bg-white/30 transition-all">
              <div className="flex items-start gap-3">
                <div className="bg-white/30 rounded-full p-2">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">{feature.title}</h4>
                  <p className="text-white text-sm">{feature.description}</p>
                </div>
                {feature.link && (
                  <ChevronRight className="w-5 h-5 flex-shrink-0 text-white" />
                )}
              </div>
              </div>
            );

            if (feature.link) {
              return (
                <Link key={feature.id} to={createPageUrl(feature.link)}>
                  {content}
                </Link>
              );
            }

            return <div key={feature.id}>{content}</div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlayCircle,
  Share2,
  Copy,
  Mail,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  ExternalLink,
  Trophy,
  Zap,
} from "lucide-react";
import { usePermissions } from "@/contexts/PermissionContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SALES_VIDEOS = [
  { featureId: 'video_hello', number: 1, label: 'HELLO', title: 'Stop Losing to Fees', description: 'How merchants lose 3\u20134% of every sale to hidden processing fees, and how dual pricing eliminates that loss.', vimeoId: '1081696337', vimeoUrl: 'https://vimeo.com/1081696337', topics: ['Fee Analysis', 'Dual Pricing', 'Profit Protection'] },
  { featureId: 'video_grow', number: 2, label: 'GROW', title: 'Reinvest & Scale Your Business', description: 'What to do with recovered savings \u2014 reinvest in marketing, build reserves, expand operations.', vimeoId: '1083204964', vimeoUrl: 'https://vimeo.com/1083204964', topics: ['Growth Strategy', 'Savings Reinvestment', 'Business Scaling'] },
  { featureId: 'video_next_steps', number: 3, label: 'NEXT STEPS', title: 'Unlock Your $1,000 Conversion Incentive', description: 'The conversion incentive package: transition support, no long-term contracts, transparent structure.', vimeoId: '1083216333', vimeoUrl: 'https://vimeo.com/1083216333', topics: ['Conversion Incentive', 'Risk-Free Switch', 'No Contracts'] },
  { featureId: 'video_trust', number: 4, label: 'TRUST', title: 'Real Support, Real Guarantees', description: 'US-based support, 60-day no-regrets policy, $500 Merchant Assurance, A+ BBB rating.', vimeoId: '1083211077', vimeoUrl: 'https://vimeo.com/1083211077', topics: ['Support', 'Guarantees', 'BBB Rating'] },
  { featureId: 'video_in_store', number: 5, label: 'IN-STORE', title: 'Payment Tools for Brick & Mortar', description: 'Smart terminals with dual-price display, all payment types, POS integration.', vimeoId: '1083221635', vimeoUrl: 'https://vimeo.com/1083221635', topics: ['Smart Terminals', 'POS Integration', 'Contactless'] },
  { featureId: 'video_mobile', number: 6, label: 'MOBILE', title: 'Get Paid Anywhere', description: 'Smartphone-as-terminal, Bluetooth readers, tablet POS, offline processing.', vimeoId: '1083228515', vimeoUrl: 'https://vimeo.com/1083228515', topics: ['Mobile Payments', 'Card Readers', 'Offline Mode'] },
  { featureId: 'video_online', number: 7, label: 'ONLINE', title: 'Get Paid Virtually', description: 'E-commerce integration, virtual terminal, recurring billing, payment links.', vimeoId: '1083232531', vimeoUrl: 'https://vimeo.com/1083232531', topics: ['E-Commerce', 'Virtual Terminal', 'Payment Links'] },
  { featureId: 'video_give_back', number: 8, label: 'GIVE BACK', title: 'Turn Business Into Impact', description: 'Every transaction powers a cause \u2014 school fundraisers, nonprofits, local charities.', vimeoId: '1083361580', vimeoUrl: 'https://vimeo.com/1083361580', topics: ['Charitable Giving', 'Community Impact', 'Social Good'] },
];

const VIDEO_BADGES = [
  { id: 'video_first_watch', name: 'First Video', icon: PlayCircle },
  { id: 'video_halfway', name: 'Halfway There', icon: PlayCircle },
  { id: 'video_all_complete', name: 'Video Master', icon: Trophy },
  { id: 'video_speed_learner', name: 'Speed Learner', icon: Zap },
];

const SHARE_URL = 'https://sales.pcbancard.com';

export default function SalesVideosTrainingPage() {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const { hasFeature } = usePermissions();
  const { toast } = useToast();

  const { data: videoProgress, isLoading: progressLoading } = useQuery<any[]>({
    queryKey: ['/api/training/video-progress'],
  });

  const { data: earnedBadges } = useQuery<any[]>({
    queryKey: ['/api/gamification/badges'],
  });

  const markWatchedMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await apiRequest('POST', `/api/training/video-progress/${videoId}`, { action: 'complete' });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/video-progress'] });
      if (data.badges && data.badges.length > 0) {
        data.badges.forEach((badge: string) => {
          toast({ title: "Badge Earned!", description: badge });
        });
      }
    },
  });

  const allowedVideos = SALES_VIDEOS.filter(v => hasFeature(v.featureId));

  const isVideoWatched = (featureId: string): boolean => {
    if (!videoProgress) return false;
    return videoProgress.some((p: any) => p.videoId === featureId && p.completed);
  };

  const watchedCount = allowedVideos.filter(v => isVideoWatched(v.featureId)).length;
  const totalCount = allowedVideos.length;
  const progressPercent = totalCount > 0 ? (watchedCount / totalCount) * 100 : 0;

  const videoBadgeIds = VIDEO_BADGES.map(b => b.id);
  const earnedVideoBadges = earnedBadges?.filter((b: any) =>
    videoBadgeIds.includes(b.badgeId) || (typeof b.badgeId === 'string' && b.badgeId.startsWith('video_'))
  ) ?? [];
  const earnedBadgeIds = new Set(earnedVideoBadges.map((b: any) => b.badgeId));

  const handleCopyLink = async (url: string, label?: string) => {
    if (typeof navigator !== 'undefined' && navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title: 'PCBancard Sales Presentation', url });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied!", description: label || "Link copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Could not copy to clipboard", variant: "destructive" });
    }
  };

  const handleShareText = () => {
    window.open(`sms:?body=Check out how PCBancard can help your business: ${SHARE_URL}`, '_self');
  };

  const handleShareEmail = () => {
    window.open(`mailto:?subject=See How Much You Could Be Saving&body=Hi, I wanted to share this with you: ${SHARE_URL}`, '_self');
  };

  if (progressLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary" />
            <span className="font-semibold">Sales Videos</span>
          </div>
        </header>
        <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-md" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary" />
            <span className="font-semibold">Sales Videos</span>
          </div>
          <span className="text-xs text-muted-foreground" data-testid="text-progress-count">
            {watchedCount}/{totalCount} watched
          </span>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section data-testid="section-header">
          <p className="text-sm text-muted-foreground mb-3">Learn the PCBancard pitch</p>
          <Progress value={progressPercent} className="h-2 mb-4" data-testid="progress-videos" />

          <div className="flex flex-wrap gap-2">
            {VIDEO_BADGES.map(badge => {
              const earned = earnedBadgeIds.has(badge.id);
              const Icon = badge.icon;
              return (
                <Badge
                  key={badge.id}
                  variant={earned ? "default" : "secondary"}
                  className={earned ? "" : "opacity-50"}
                  data-testid={`badge-${badge.id}`}
                >
                  {earned ? <Check className="w-3 h-3 mr-1" /> : <Icon className="w-3 h-3 mr-1" />}
                  {badge.name}
                </Badge>
              );
            })}
          </div>
        </section>

        <section data-testid="section-merchant-share">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Merchant Sales Presentation</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Share the sales presentation with merchants to show them how PCBancard can help their business.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyLink(SHARE_URL)}
                data-testid="button-copy-merchant-link"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareText}
                data-testid="button-share-text"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Share via Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareEmail}
                data-testid="button-share-email"
              >
                <Mail className="w-4 h-4 mr-1" />
                Share via Email
              </Button>
            </div>
          </Card>
        </section>

        <section className="space-y-3" data-testid="section-video-list">
          {allowedVideos.map(video => {
            const isExpanded = expandedVideo === video.featureId;
            const watched = isVideoWatched(video.featureId);
            const isMutating = markWatchedMutation.isPending && markWatchedMutation.variables === video.featureId;

            return (
              <Card key={video.featureId} className="overflow-visible" data-testid={`card-video-${video.featureId}`}>
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedVideo(isExpanded ? null : video.featureId)}
                  data-testid={`button-toggle-video-${video.featureId}`}
                >
                  <div className="flex flex-col items-center justify-center w-10 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{video.number}</span>
                    <span className="text-[10px] font-semibold text-primary leading-tight">{video.label}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.title}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {watched && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400" data-testid={`status-watched-${video.featureId}`}>
                        <Check className="w-3.5 h-3.5" />
                        Watched
                      </span>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(video.vimeoUrl, `${video.label} video link copied`);
                      }}
                      data-testid={`button-share-video-${video.featureId}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-sm text-muted-foreground">{video.description}</p>

                    <iframe
                      src={`https://player.vimeo.com/video/${video.vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="w-full aspect-video rounded-md"
                      title={video.title}
                      data-testid={`iframe-video-${video.featureId}`}
                    />

                    <div className="flex flex-wrap gap-1">
                      {video.topics.map(topic => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {watched ? (
                        <Button
                          size="sm"
                          disabled
                          className="bg-emerald-600 text-white hover:bg-emerald-600"
                          data-testid={`button-watched-${video.featureId}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Watched
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => markWatchedMutation.mutate(video.featureId)}
                          disabled={isMutating}
                          data-testid={`button-mark-watched-${video.featureId}`}
                        >
                          {isMutating ? "Saving..." : "Mark as Watched"}
                        </Button>
                      )}
                      <a
                        href={video.vimeoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-vimeo-${video.featureId}`}
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open in Vimeo
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {allowedVideos.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground" data-testid="text-no-videos">
                No training videos are available for your current access level. Contact your manager for access.
              </p>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}

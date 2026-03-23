import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitPullRequest, ExternalLink, User, Clock } from 'lucide-react';
import { fetchPullRequests } from '@/functions/fetchPullRequests';
import moment from 'moment';

export default function PullRequests() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['github_pull_requests'],
        queryFn: async () => {
            const res = await fetchPullRequests({});
            return res.data?.pullRequests || [];
        }
    });

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <GitPullRequest className="h-8 w-8 text-blue-600" />
                        Pending Pull Requests
                    </h1>
                    <p className="text-slate-500 mt-2">Review and manage open pull requests for kdeyarmin/pennsync</p>
                </div>
            </div>

            {isLoading && (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="h-24" />
                        </Card>
                    ))}
                </div>
            )}

            {error && (
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="py-6 text-red-600 flex items-center gap-2">
                        <span>Failed to load pull requests: {error.message}</span>
                    </CardContent>
                </Card>
            )}

            {!isLoading && !error && data?.length === 0 && (
                <Card className="bg-slate-50 border-dashed">
                    <CardContent className="py-12 flex flex-col items-center justify-center text-slate-500">
                        <GitPullRequest className="h-12 w-12 mb-4 text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900">No Pending Pull Requests</h3>
                        <p>There are currently no open pull requests to review.</p>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                {data?.map(pr => (
                    <Card key={pr.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-semibold text-slate-900">
                                            {pr.title}
                                        </h3>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            #{pr.number}
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            {pr.user.login}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            Opened {moment(pr.created_at).fromNow()}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 text-sm mt-2">
                                        <Badge variant="secondary" className="bg-slate-100">
                                            {pr.head.ref} &rarr; {pr.base.ref}
                                        </Badge>
                                    </div>
                                </div>

                                <Button 
                                    variant="outline" 
                                    onClick={() => window.open(pr.html_url, '_blank')}
                                    className="shrink-0"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Review PR
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
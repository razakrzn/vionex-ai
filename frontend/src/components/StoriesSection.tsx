import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAgentsApi, type AdminUser } from "@/services/admin/users";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Agent extends AdminUser {
  company_name?: string | null;
  seller_type_display?: string;
  emirate_name?: string;
  country_name?: string;
}

const StoriesSection = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoading(true);
        const response = await getAgentsApi();
        
        if (response && 'data' in response && 'status' in response) {
          const responseData = response.data;
          const agentsData = responseData?.data || [];
          
          if (Array.isArray(agentsData)) {
            setAgents(agentsData);
          }
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleAgentClick = (agentId: number) => {
    navigate(`/agent/${agentId}`);
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="mb-2 md:mb-3 pt-4 md:pt-6 lg:pt-8 animate-slide-up">
        <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2 px-1 justify-center">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg border-2 border-primary/30 bg-muted/50 animate-pulse" />
              <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className=" mb-0 md:mb-3 pt-4 md:pt- lg:pt-7 animate-slide-up">
      <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-0 px-1 justify-center">
        {agents.map((agent) => {
          const displayName = agent.company_name || agent.full_name || agent.email || "Agent";
          const username = agent.full_name || agent.email || "agent";
          const truncatedUsername = username.length > 12 ? username.substring(0, 12) + "..." : username;
          
          return (
            <div
              key={agent.id}
              onClick={() => handleAgentClick(agent.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            >
              <div className="relative">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg border-2 border-primary group-hover:scale-105 transition-transform overflow-hidden">
                  {agent.profile_picture ? (
                    <img
                      src={agent.profile_picture}
                      alt={displayName}
                      className="w-full h-full rounded-lg object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('span');
                          fallback.className = 'w-full h-full flex items-center justify-center text-xs md:text-sm font-semibold text-primary bg-primary/20';
                          fallback.textContent = getInitials(displayName);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xs md:text-sm font-semibold text-primary bg-primary/20">
                      {getInitials(displayName)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] md:text-xs text-muted-foreground text-center max-w-[60px] md:max-w-[70px] truncate">
                {truncatedUsername}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StoriesSection;


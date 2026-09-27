-- Demo roster portraits — photos live in the app at /public/members/.
-- Run once in the SQL Editor. Matches members by their tag.
update public.team_members set photo_url = '/members/vortex.jpg' where tag = 'VORTEX';
update public.team_members set photo_url = '/members/titan.jpg'  where tag = 'TITAN';
update public.team_members set photo_url = '/members/nova.jpg'   where tag = 'NOVA';
update public.team_members set photo_url = '/members/blaze.jpg'  where tag = 'BLAZE';
update public.team_members set photo_url = '/members/ghost.jpg'  where tag = 'GHOST';
update public.team_members set photo_url = '/members/storm.jpg'  where tag = 'STORM';
update public.team_members set photo_url = '/members/havoc.jpg'  where tag = 'HAVOC';
update public.team_members set photo_url = '/members/reel.jpg'   where tag = 'REEL';

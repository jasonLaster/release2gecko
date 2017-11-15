# https://glandium.org/blog/?page_id=3438

git init gecko
cd gecko

# Set fetch.prune for git-cinnabar to be happier:
git config fetch.prune true

# Set push.default to “upstream”, which I think allows a better workflow to use
# topic branches and push them more easily:

git config push.default upstream

# Add remotes for the mercurial repositories you pull from

git remote add central hg::https://hg.mozilla.org/mozilla-central -t branches/default/tip
git remote add inbound hg::https://hg.mozilla.org/integration/mozilla-inbound -t branches/default/tip
git remote set-url --push inbound hg::ssh://hg.mozilla.org/integration/mozilla-inbound



# -t branches/default/tip is there to reduce the amount of churn from the
# old branches on these repositories. If you want access to all the branch tips,
# my recommended setting is the following:

git config remote.central.fetch +refs/heads/branches/*/tip:refs/remotes/central/*
git config remote.inbound.fetch +refs/heads/branches/*/tip:refs/remotes/inbound/*

#  This exposes the branch tips as refs/remotes/$remote/$branch instead of refs/remotes/$remote/branches/$branch/tip. You can use a similar setup without the wildcards if you want the remote branch names to be shorter, such as:

git config remote.central.fetch +refs/heads/branches/default/tip:refs/remotes/central/default
git config remote.inbound.fetch +refs/heads/branches/default/tip:refs/remotes/inbound/default


# This exposes the tip of the default branch as refs/remotes/$remote/default instead of refs/remotes/$remote/branches/default/tip.


git remote add try hg::https://hg.mozilla.org/try
git config remote.try.skipDefaultUpdate true
git remote set-url --push try hg::ssh://hg.mozilla.org/try
git config remote.try.push +HEAD:refs/heads/branches/default/tip

# Update all the remotes:

git remote update

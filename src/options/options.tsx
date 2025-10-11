import React from 'react';
import { createRoot } from 'react-dom/client';
import './options.css';
import { createStore } from '../store';
import { ActionType } from '../store/action-types';
import { Settings } from '../background/store';
import { getBrowser } from '../webextension';
import { Sites, SiteId } from '../sites';
import { getSiteStatus, SiteStatus, SiteStatusTag } from '../background/store/sites/selectors';
import { MINUTE, HOUR, DAY, readableDuration } from '../lib/time';

// MUI
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { createTheme, ThemeProvider, useMediaQuery } from '@mui/material';

const store = createStore();

function useStore() {
  const [, force] = React.useReducer((c) => c + 1, 0);
  React.useEffect(() => {
    // Subscribe to store updates and force re-render; unsubscribe not provided
    store.subscribe(() => force());
  }, []);
  return store.getState();
}

function StatusChip({ status }: { status: SiteStatus }) {
  switch (status.type) {
    case SiteStatusTag.ENABLED:
      return <Chip size="small" color="success" label="Enabled" variant="outlined" />;
    case SiteStatusTag.NEEDS_NEW_PERMISSIONS:
      return <Chip size="small" color="warning" label="Needs permissions" variant="outlined" />;
    case SiteStatusTag.DISABLED:
      return <Chip size="small" label="Off" variant="outlined" />;
    case SiteStatusTag.DISABLED_TEMPORARILY:
      return (
        <Chip size="small" label={`Off for ${readableDuration(status.until - Date.now())}`} variant="outlined" />
      );
  }
}

function DisableConfirm({ siteId }: { siteId: SiteId }) {
  const onConfirm = (ms: number | 'forever') => () => {
    store.dispatch({
      type: ActionType.UI_SITES_SITE_DISABLE_CONFIRMED,
      site: siteId,
      until: ms === 'forever' ? { t: 'forever' } : { t: 'temporarily', milliseconds: ms },
    });
  };
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
      <Typography variant="body2" sx={{ mr: 1 }}>Show feed for:</Typography>
      <Button size="small" variant="outlined" onClick={onConfirm(5 * MINUTE)}>5 min</Button>
      <Button size="small" variant="outlined" onClick={onConfirm(HOUR)}>1 hr</Button>
      <Button size="small" variant="outlined" onClick={onConfirm('forever')}>Forever</Button>
    </Stack>
  );
}

function SitesList() {
  const state = useStore();
  if (state.settings == null) return null;
  const statuses = getSiteStatus(state.settings);

  const onClick = (id: SiteId) => () => {
    store.dispatch({ type: ActionType.UI_SITES_SITE_CLICK, site: id });
  };

  return (
    <List disablePadding>
      {Object.keys(Sites).map((id) => {
        const siteId = id as SiteId;
        const status = statuses[siteId];
        const enabled = status.type === SiteStatusTag.ENABLED || status.type === SiteStatusTag.NEEDS_NEW_PERMISSIONS;
        const showConfirm = state.uiOptions.confirmDisableSite === siteId;
        return (
          <React.Fragment key={id}>
            <ListItem
              disablePadding
              secondaryAction={<StatusChip status={status} />}
            >
              <ListItemButton onClick={onClick(siteId)}>
                <ListItemText primary={Sites[siteId].label} />
              </ListItemButton>
            </ListItem>
            {showConfirm && (
              <Box sx={{ pl: 2, pr: 2, pb: 2 }}>
                <DisableConfirm siteId={siteId} />
              </Box>
            )}
            <Divider component="li" />
          </React.Fragment>
        );
      })}
    </List>
  );
}

function OptionsApp() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = React.useMemo(() => createTheme({ palette: { mode: prefersDark ? 'dark' : 'light' } }), [prefersDark]);
  // Snapshot fallback: if settings haven't arrived shortly after mount, load from storage
  React.useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const state = store.getState();
      if (state.settings != null) return; // already loaded
      try {
        const [raw, perms] = await Promise.all([
          Settings.load(),
          getBrowser().permissions.getAll().catch(() => ({ permissions: [], origins: [] })),
        ]);
        if (cancelled) return;
        // Merge sites against known sites list
        const siteIds = Object.keys(Sites) as (keyof typeof Sites)[];
        const mergedSites: Settings.SitesState = {} as Settings.SitesState;
        for (const id of siteIds) {
          const s = (raw.sites as any)[id];
          mergedSites[id as any] = s != null ? s : { type: Settings.SiteStateTag.CHECK_PERMISSIONS };
        }
        const snapshot = {
          showQuotes: raw.showQuotes,
          builtinQuotesEnabled: raw.builtinQuotesEnabled,
          featureIncrement: raw.featureIncrement,
          hiddenBuiltinQuotes: raw.hiddenBuiltinQuotes,
          customQuotes: raw.customQuotes,
          sites: mergedSites as any,
          permissions: perms,
        };
        store.dispatch({ type: ActionType.BACKGROUND_SETTINGS_CHANGED, settings: snapshot as any });
      } catch (_) {
        // ignore; background connection will deliver eventually
      }
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" align="center">Social Feed Blocker</Typography>
        </Box>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Sites</Typography>
            <Typography variant="body2" color="text.secondary">
              Choose sites below to enable Social Feed Blocker. When you enable a site, we'll request your permission to modify that site.
            </Typography>
          </Box>
          <Divider />
          <SitesList />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

function start() {
  const container = document.getElementById('app');
  if (!container) throw new Error('Root element not found');
  const root = createRoot(container);
  root.render(<OptionsApp />);
}

start();

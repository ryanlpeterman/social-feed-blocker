import React from 'react';
import { createRoot } from 'react-dom/client';
import './options.css';
import { createStore } from '../store';
import { Sites, SiteId } from '../sites';
import { getSiteStatus, SiteStatus, SiteStatusTag } from '../background/store/sites/selectors';
import { ActionType } from '../store/action-types';
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
import Switch from '@mui/material/Switch';
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
    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
      <Typography variant="body2" sx={{ mr: 1 }}>Show feed for:</Typography>
      <Button size="small" variant="outlined" onClick={onConfirm(5 * MINUTE)}>5 min</Button>
      <Button size="small" variant="outlined" onClick={onConfirm(10 * MINUTE)}>10 min</Button>
      <Button size="small" variant="outlined" onClick={onConfirm(30 * MINUTE)}>30 min</Button>
      <Button size="small" variant="outlined" onClick={onConfirm(HOUR)}>1 hr</Button>
      <Button size="small" variant="outlined" onClick={onConfirm(DAY)}>1 day</Button>
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
            <ListItem disablePadding secondaryAction={
              <Stack direction="row" spacing={2} alignItems="center">
                <StatusChip status={status} />
                <Switch edge="end" checked={enabled} onChange={onClick(siteId)} />
              </Stack>
            }>
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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" align="center">News Feed Eradicator</Typography>
          <Typography variant="body2" color="text.secondary" align="center">Settings</Typography>
        </Box>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Sites</Typography>
            <Typography variant="body2" color="text.secondary">
              Choose sites below to enable News Feed Eradicator. When you enable a site, we'll request your permission to modify that site.
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

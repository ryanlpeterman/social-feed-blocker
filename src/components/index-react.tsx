import React from 'react';
import { Store } from '../store';
import { currentQuote } from '../store/selectors';
import { removeCurrentQuote, selectNewQuote, menuHide, menuToggle, showOptions } from '../store/actions';
import { ActionType } from '../store/action-types';

// MUI
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

function useStoreSubscribe(store: Store) {
  const [, force] = React.useReducer((c) => c + 1, 0);
  React.useEffect(() => {
    store.subscribe(() => force());
  }, [store]);
}

export default function NewsFeedEradicatorReact({ store }: { store: Store }) {
  useStoreSubscribe(store);
  const state = store.getState();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(state.isQuoteMenuVisible && anchorEl);

  const onMenuClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    store.dispatch(menuToggle());
  };
  const onMenuClose = () => {
    setAnchorEl(null);
    store.dispatch(menuHide());
  };

  const onRemove = () => {
    store.dispatch(menuHide());
    store.dispatch(removeCurrentQuote());
  };
  const onAnother = () => {
    store.dispatch(menuHide());
    store.dispatch(selectNewQuote());
  };
  const onSettings = () => {
    store.dispatch(menuHide());
    store.dispatch(showOptions());
  };

  const quote = currentQuote(state);

  const onOpenOptions = () => store.dispatch({ type: ActionType.UI_OPTIONS_SHOW });

  return (
    <Box sx={{ fontFamily: 'sans-serif' }}>
      {state.settings?.showQuotes && quote && (
        <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton size="small" onClick={onMenuClick} aria-label="quote menu">
              ▾
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={onMenuClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
              <MenuItem onClick={onRemove}>Remove this quote</MenuItem>
              <MenuItem onClick={onAnother}>See another quote</MenuItem>
              <MenuItem onClick={onSettings}>Settings…</MenuItem>
            </Menu>
          </Box>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            “{quote.text}”
          </Typography>
          {'source' in quote ? (
            <Typography variant="body2" color="text.secondary">~ {quote.source}</Typography>
          ) : null}
        </Paper>
      )}
      <Typography
        variant="body2"
        color="primary"
        sx={{ cursor: 'pointer', textDecoration: 'underline' }}
        onClick={onOpenOptions}
      >
        News Feed Eradicator
      </Typography>
    </Box>
  );
}


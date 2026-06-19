export function getFriendlyError(errorOrDetail = {}) {
  const status = errorOrDetail?.status || errorOrDetail?.response?.status;
  const rawMessage = String(errorOrDetail?.message || errorOrDetail?.response?.data?.message || '').trim();
  const lower = rawMessage.toLowerCase();

  if (status === 401 || lower.includes('unauthenticated')) {
    return {
      title: 'Please sign in first',
      description: 'You need to log in to continue. If you were already logged in, your session may have expired.',
    };
  }
  if (status === 403 || lower.includes('forbidden') || lower.includes('permission')) {
    return {
      title: 'Access denied',
      description: 'Your account does not have permission to perform this action.',
    };
  }
  if (status === 404 || lower.includes('not found')) {
    return {
      title: 'Item not found',
      description: 'The item may have been removed or is no longer available.',
    };
  }
  if (status === 419 || lower.includes('csrf')) {
    return {
      title: 'Session expired',
      description: 'Please refresh the page and try again.',
    };
  }
  if (status === 422 || lower.includes('validation')) {
    return {
      title: 'Check your information',
      description: cleanValidationMessage(rawMessage) || 'Please complete all required fields correctly before submitting.',
    };
  }
  if (status >= 500) {
    return {
      title: 'Service temporarily unavailable',
      description: 'We could not complete the request right now. Please try again in a moment.',
    };
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return {
      title: 'Connection problem',
      description: 'Please make sure the server is running, then try again.',
    };
  }
  if (lower.includes('ai') || lower.includes('gemini')) {
    return {
      title: 'AI assistant is warming up',
      description: 'The assistant could not reach the live AI service, so the platform will keep working with local help.',
    };
  }
  return {
    title: 'Request could not be completed',
    description: rawMessage && !hasTechnicalWords(rawMessage) ? rawMessage : 'Please review your information and try again.',
  };
}

function cleanValidationMessage(message) {
  if (!message || hasTechnicalWords(message)) return '';
  return message
    .replace(/The /g, '')
    .replace(/ field/g, '')
    .replace(/_/g, ' ')
    .trim();
}

function hasTechnicalWords(message) {
  const lower = String(message).toLowerCase();
  return ['platform', 'stack trace', 'sqlstate', 'exception', 'undefined index', 'syntax error', 'validation /'].some((word) => lower.includes(word));
}

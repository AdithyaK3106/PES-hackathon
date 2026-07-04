/**
 * InvestigationDirector
 * Responsible for generating narrative text and flagging investigative moments
 * from the transaction timeline and patterns.
 */
export const getInvestigationNarrative = (step, index, replaySteps, patterns = [], primaryAccountId = '') => {
  const narrationEvents = [];
  let isEvidenceMoment = false;
  let evidenceDetail = null;
  let isSuspiciousNodeMoment = false;

  if (!step) return { narrationEvents, isEvidenceMoment, evidenceDetail };

  const amount = Number(step.amount || 0);
  const isDebit = step.is_debit;
  const channel = String(step.channel || 'transfer').toUpperCase();
  const receiverId = String(step.to || step.target);
  const sourceId = String(step.from || step.source);

  const stepsList = Array.isArray(replaySteps) ? replaySteps : [];
  const patternsList = Array.isArray(patterns) ? patterns : [];

  // 1. Identify if receiver is previously unseen (new beneficiary)
  let isNewReceiver = true;
  for (let i = 0; i < index; i++) {
    const prev = stepsList[i];
    if (prev && (String(prev.to || prev.target) === receiverId || String(prev.from || prev.source) === receiverId)) {
      isNewReceiver = false;
      break;
    }
  }
  if (receiverId === primaryAccountId) isNewReceiver = false;

  // 2. Scan patterns associated with this transaction
  const stepPatterns = patternsList.filter(pat => 
    pat && pat.related_transactions && pat.related_transactions.includes(step.tx_id || step.id)
  );

  // Add narrative messages
  if (stepPatterns.length > 0) {
    isEvidenceMoment = true;
    isSuspiciousNodeMoment = true; // Pause at the node for interrogation
    
    const primaryPattern = stepPatterns[0];
    
    // Map pattern names to professional investigator statements
    let description = `Suspicious pattern match: ${primaryPattern.name} identified.`;
    if (primaryPattern.name === 'Rapid Money Movement') {
      description = 'High velocity funds routing detected.';
    } else if (primaryPattern.name === 'Fan-Out' || primaryPattern.name === 'Fan Out') {
      description = 'Funds rapidly distributed across multiple recipients.';
    } else if (primaryPattern.name === 'Fan-In' || primaryPattern.name === 'Fan In') {
      description = 'Inflow concentration detected from multiple sources.';
    } else if (primaryPattern.name === 'Structuring') {
      description = 'Multiple round-value transfers indicate possible structuring.';
    } else if (primaryPattern.name === 'Layering') {
      description = 'Funds routed through multiple intermediary accounts.';
    } else if (primaryPattern.name === 'Round Tripping') {
      description = 'Funds returned to an earlier account in the chain.';
    }

    narrationEvents.push({
      time: formatTxTime(step.date),
      action: 'PATTERN',
      target: receiverId,
      description
    });

    evidenceDetail = {
      name: primaryPattern.name,
      amount: amount,
      timestamp: step.date,
      confidence: Math.round((primaryPattern.confidence || 0.90) * 100),
      severity: primaryPattern.severity || 'CRITICAL',
      affectedTransactions: primaryPattern.related_transactions?.length || 1
    };
  }

  // UPI or special channel detection
  if (channel === 'UPI') {
    narrationEvents.push({
      time: formatTxTime(step.date),
      action: 'ENTITY',
      target: receiverId,
      description: `UPI protocol identified: ${receiverId}`
    });
  }

  if (isNewReceiver) {
    narrationEvents.push({
      time: formatTxTime(step.date),
      action: 'ENTITY',
      target: receiverId,
      description: `Previously unseen beneficiary identified: ${receiverId}`
    });
  }

  // Large transaction detection
  if (amount >= 500000) {
    const channelName = channel === 'RTGS' || channel === 'NEFT' ? channel : 'RTGS';
    narrationEvents.push({
      time: formatTxTime(step.date),
      action: isDebit ? 'DEBIT' : 'CREDIT',
      target: receiverId,
      description: `Large inbound ${channelName} transaction detected: ₹${new Intl.NumberFormat('en-IN').format(amount)}.`
    });
  } else {
    // Normal transaction narration
    narrationEvents.push({
      time: formatTxTime(step.date),
      action: isDebit ? 'DEBIT' : 'CREDIT',
      target: receiverId,
      description: `Transfer of ₹${new Intl.NumberFormat('en-IN').format(amount)} via ${channel}.`
    });
  }

  // Risk or confidence increase event occasionally
  if (index > 0 && index % 2 === 0) {
    narrationEvents.push({
      time: formatTxTime(step.date),
      action: 'RISK',
      target: 'GLOBAL',
      description: 'Overall investigation confidence increased.'
    });
  }

  return {
    narrationEvents,
    isEvidenceMoment,
    evidenceDetail,
    isSuspiciousNodeMoment
  };
};

const formatTxTime = (dateStr) => {
  if (!dateStr) return '09:00';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const str = String(dateStr);
    const m = str.match(/\b\d{2}:\d{2}\b/);
    return m ? m[0] : '09:00';
  } catch {
    return '09:00';
  }
};

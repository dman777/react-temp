//import * as React from 'react';
//import * as ReactDOM from 'react-dom';
import moment from 'moment';


export function toggle(event, node, key) {
  event.preventDefault();

  //const node = ReactDOM.findDOMNode(this);

  //const refId = event.target.attributes['data-target'].nodeValue;
  const dataRefs = node.querySelector('#' + key);
  const menuRef = node.querySelector('#' + key + 'menu')

  dataRefs.classList.toggle('collapse')

  if (menuRef.classList.contains("glyphicon-menu-down")) {
    menuRef.classList.replace('glyphicon-menu-down', 'glyphicon-menu-up')

  } else if (menuRef.classList.contains("glyphicon-menu-up")) {
    menuRef.classList.replace('glyphicon-menu-up', 'glyphicon-menu-down')
  }



};


/**
 * Given some input argument, this function tries to treat it like an error and
 * extract an error message out of it. Supported input types are:
 * - String
 * - Error
 * - AJAX JSON response
 * - FHIR JSON response
 * - Object map of error messages
 * @param {*} input The input to analyse
 * @param {String|JSX.Element} error(s)
 */
export function getErrorMessage(input) {
  if (input && typeof input === 'string') {
    return input;
  }

  let out = 'Unknown error';

  if (input && input instanceof Error) {
    out = String(input);
  } else if (input && input.responseJSON) {
    if (
      Array.isArray(input.responseJSON.issue) &&
      input.responseJSON.issue.length
    ) {
      out = input.responseJSON.issue.map((o) => o.diagnostics || '-').join('\n');
    } else {
      out =
        input.responseJSON.message || input.responseJSON.error || 'Unknown error';
    }
  } else if (input && input.responseText) {
    out = input.responseText + ' - ' + input.statusText || 'Unknown error';
  } else if (input && input.statusText) {
    if (input.statusText === 'timeout') {
      out = 'The server failed to respond in the desired number of seconds';
    } else {
      out = input.statusText || 'Unknown error';
    }
  }

  if (out && typeof out === 'object') {
    let out2 = [];
    for (let key in out) {
      out2.push(React.createElement('li', { key }, out[key]));
    }
    return React.createElement('div', null, [
      'Multiple errors',
      React.createElement('ul', null, out2),
    ]);
  }

  return String(out).replace(/(Error\:\s)+/, 'Error: ');
}

/**
 * Walks thru an object (ar array) and returns the value found at the provided
 * path. This function is very simple so it intentionally does not support any
 * argument polymorphism, meaning that the path can only be a dot-separated
 * string. If the path is invalid returns undefined.
 * @param {Object} obj The object (or Array) to walk through
 * @param {String} path The path (eg. "a.b.4.c")
 * @returns {*} Whatever is found in the path or undefined
 */
export function getPath(obj, path = '') {
  return path.split('.').reduce((out, key) => (out ? out[key] : undefined), obj);
}

// Fhir parsing helpers --------------------------------------------------------

/**
 * Given an array of Coding objects finds and returns the one that contains
 * an MRN (using a code == "MR" check)
 * @export
 * @param {Object[]} codings Fhir.Coding[]
 * @returns {Object} Fhir.Coding | undefined
 */
export function findMRNCoding(codings) {
  if (Array.isArray(codings)) {
    return codings.find((coding) => coding.code === 'MR');
  }
}

/**
 * Given an array of identifier objects finds and returns the one that contains an MRN
 * @export
 * @param {Object[]} identifiers
 * @returns {Object}
 */
export function findMRNIdentifier(identifiers) {
  return identifiers.find(
    (identifier) => !!findMRNCoding(getPath(identifier, 'type.coding'))
  );
}

/**
 * Given a patient returns his MRN
 * @export
 * @param {Object} patient
 * @returns {string}
 */
export function getPatientMRN(patient) {
  let mrn = null;

  if (Array.isArray(patient.identifier) && patient.identifier.length) {
    mrn = findMRNIdentifier(patient.identifier);
    if (mrn) {
      return mrn.value;
    }
  }

  return mrn;
}

/**
 * Extracts and returns a human-readable name string from FHIR patient object.
 * @param {Object} patient FHIR patient object
 * @returns {String} Patient's name or an empty string
 */
export function getPatientName(patient) {
  if (!patient) {
    return '';
  }

  let name = patient.name;
  if (!Array.isArray(name)) {
    name = [name];
  }
  name = name[0];
  if (!name) {
    return '';
  }

  let family = Array.isArray(name.family) ? name.family : [name.family];
  let given = Array.isArray(name.given) ? name.given : [name.given];
  let prefix = Array.isArray(name.prefix) ? name.prefix : [name.prefix];
  let suffix = Array.isArray(name.suffix) ? name.suffix : [name.suffix];

  return [
    prefix.map((t) => String(t || '').trim()).join(' '),
    given.map((t) => String(t || '').trim()).join(' '),
    family.map((t) => String(t || '').trim()).join(' '),
    suffix.map((t) => String(t || '').trim()).join(' '),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Given a FHIR patient object, returns the patient's phone number (or empty string).
 * Note that if the patient have multiple phones this will only return the first one.
 * @param {Object} patient FHIR patient object
 * @returns {String} Patient's phone or an empty string
 */
export function getPatientPhone(patient = {}) {
  let phone = (patient.telecom || []).find((c) => c.system === 'phone');
  return phone ? phone.value : '';
}

/**
 * Given a FHIR patient object, returns the patient's email (or an empty string).
 * Note that if the patient have multiple emails this will only return the first one.
 * @param {Object} patient FHIR patient object
 * @returns {String} Patient's email address or an empty string
 */
export function getPatientEmail(patient = {}) {
  const phone = (patient.telecom || []).find((c) => c.system === 'email');
  return phone ? phone.value || '' : '';
}

/**
 * Extracts and returns a human-readable address string from FHIR patient object.
 * @param {Object} patient FHIR patient object
 * @returns {String} Patient's address or an empty string
 */
export function getPatientHomeAddress(patient = {}) {
  let a = patient.address || [];
  a = a.find((c) => c.use === 'home') || a[0] || {};
  return [a.line, a.postalCode, a.city, a.country]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Extracts and returns a human-readable age string from FHIR patient object.
 * @param {Object} patient FHIR patient object
 * @returns {String} Patient's age
 */
export function getPatientAge(patient) {
  let from = moment(patient.birthDate);
  let to = moment(patient.deceasedDateTime || undefined);
  let age = to - from;

  let seconds = Math.round(age / 1000);
  if (seconds < 60) {
    return seconds + ' second';
  }

  let minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return minutes + ' minute';
  }

  let hours = Math.round(minutes / 60);
  if (hours < 24) {
    return hours + ' hour';
  }

  let days = Math.round(hours / 24);
  if (days < 30) {
    return days + ' day';
  }

  let months = Math.round(days / 30);
  if (months < 24) {
    return months + ' month';
  }

  let years = Math.round(days / 365);
  return years + ' year';
}

/**
 * Extracts and returns an URL pointing to the patient photo (or an empty string)
 * @param {Object} patient FHIR patient object
 * @returns {String} Patient's image URL
 */
export function getPatientImageUri(patient, base = '') {
  let data = getPath(patient, 'photo.0.data') || '';
  let url = getPath(patient, 'photo.0.url') || '';
  let type = getPath(patient, 'photo.0.contentType') || '';
  if (url.indexOf('/') === 0) {
    url = base + '' + url;
  }
  let http = url && url.match(/^https?:\/\//);
  if (!http && data) {
    if (type && data.indexOf('data:') !== 0) {
      data = `data:${type};base64,${data}`;
    }
    url = data;
  } else if (type && !http) {
    url = `data:${type};base64,${url}`;
  }
  return url;
}

/**
 * Return the display text for the given CodeableConcept
 * @param {Object} concept CodeableConcept
 * @returns {String}
 */
export function getCodeableConcept(concept, defaultValue = '-') {
  return String(
    getPath(concept, 'coding.0.display') ||
    getPath(concept, 'coding.0.code') ||
    concept.text ||
    defaultValue
  );
}

/**
 * Some elements are of type `code` in older FHIR versions, but have been
 * converted to CodeableConcept in later versions
 * @param {String|Object} data Code or CodeableConcept
 * @returns {String}
 */
export function getCodeOrConcept(data, defaultValue = '-') {
  if (typeof data === 'string') return data || defaultValue;
  return getCodeableConcept(data, defaultValue);
}

/**
 * Uses searchHighlight() to generate and return a JSX.span element containing
 * the @html string with @search highlighted
 * @param {String} html The input string
 * @param {String} search The string to search for
 * @returns {JSX.span} SPAN element with the matches highlighted
 */
export function renderSearchHighlight(html, search) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: search ? searchHighlight(html, search) : html,
      }}
    />
  );
}

/**
 * Queries the FHIR store using product and patient
 * @param {String} token  authentication token used to authenticate the request in the FHIR store
 * @param {String} serverUrl FHIR store URL
 * @param {String} serverUrl  indentifier used to pull product specific bundles.
 * @param {product} patientId patient identifier
 * @returns {Promise} resolve/reject of the requested payload
 */
export function getFHIRResource(token, serverUrl, product, patientId) {
  return fetch(`${serverUrl}/api/v1/${product}/bundle/latest/${patientId}`, {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  })
    .then(response => response.json())
    .catch(err => {
      let message = getErrorMessage(err);
      if (message && typeof message === 'string') {
        throw new Error(message);
      }
    });
}

export function pullFhirResource(token, serverUrl, product, patId) {
  var result = [];

  return getFHIRResource(token, serverUrl, product, patId).then((bundle) => {
    (bundle.entry || []).forEach((item) => {
      if (
        item.fullUrl &&
        result.findIndex((o) => o.fullUrl === item.fullUrl) == -1
      ) {
        result.push(item);
      }
    });
    return result;
  });
}


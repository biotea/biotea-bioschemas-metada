export const template = {
    "@context": "http://schema.org",
    "@type": "CreativeWork",
    "identifier": "biotea:",
    "isBasedOn": "",
    "dateCreated": "",
    "sdPublisher" : "",
    "creator": "http://biotea.github.io/agent/biotea_serializer",
    "sdLicense": "https://creativecommons.org/licenses/by/4.0/",
    "version" : "",
    "sameAs": [],
    "mainEntity": {
        "@id": "https://doi.org/", 
        "@type": "ScholarlyArticle",
        "identifier": "doi:",
        "url": "https://doi.org/",
        "alternateName": [],
        "headline": "",    
        "pageStart": "",
        "pageEnd": "",    
        "datePublished": "",
        "backstory": "",
        "author": [],    
        "sameAs": []
    }
    
};

export const issue = {
    "@type": "PublicationIssue",
    "issueNumber": ""
};

export const volJournal = {
    "@type": "PublicationVolume",
    "volumeNumber": "",
    "isPartOf": {
        "@type": ["Periodical"],
        "issn": [],
        "name": "",
        "publisher": {
            "@type" : "Organization",
            "name": ""
        } 
    }
};

export const author = {
    "@type": "Person",
    "givenName": "",
    "familyName": "",
    "name": ""
};

export const citation = { 
    "@type": "ScholarlyArticle"
};
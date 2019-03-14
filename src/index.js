/*jslint node: true */
"use strict";

import * as Convert from 'fast-xml-parser';
import {template, author, issue, volJournal, citation} from './Context';
import {clone, find} from 'lodash-es';

class BioteaBioschemasMetadata extends HTMLElement  {    
    constructor() {
        super();
        this._convertedData = {};
        this._data = undefined;
    }

    static get observedAttributes() { 
        return ["render", "publisher", "version", "metadataid", "loading", "queryurl"]; 
    }

    get render() {
        return (this.getAttribute("render"));
    }

    get publisher() {
        return (this.getAttribute("publisher"));
    }

    get version() {
        return (this.getAttribute("version"));
    }

    get metadataid() {
        return (this.getAttribute("metadataid"));
    }

    get loading() {
        return (this.getAttribute("loading"));
    }

    get queryurl() {
        return (this.getAttribute("queryurl"));
    }

    set render(value) {
        this.setAttribute("render", value);
    }

    set publisher(value) {
        this.setAttribute("publisher", value);
    }

    set version(value) {
        this.setAttribute("version", value);
    }

    set metadataid(value) {
        this.setAttribute("loametadataidding", value);
    }

    set loading(value) {
        this.setAttribute("loading", value);
    }

    set queryurl(value) {
        this.setAttribute("queryurl", value);
    }

    getData() {
        return this._data;
    }

    attributeChangedCallback(attrName, oldVal, newVal) {
        if ((attrName === 'queryurl') && (newVal != undefined)) {
            this._fetchData();
        }
        this._parseData();
    }

    async _fetchData() {
        this.loading = 'on';
        const response = await fetch(this.queryurl);
        this._data = await response.text();
        this.loading = 'off';       
    }

    _parseData() {
        if (this._data != undefined) { 
            const converted = Convert.parse(this._data, {ignoreAttributes: false}); 
            this.dispatchEvent(new CustomEvent(
                'load', {
                    detail: {
                        data: converted
                    },
                    bubbles: true,
                    cancelable: true
                }
            ));

            try {                                           
                const articleFront = converted["OAI-PMH"].GetRecord.record.metadata.article.front;
                this._parseArticle(articleFront);
                this._parseJournal(articleFront);
            } catch (err1) {
                console.log('Parsing error', err1);
            } 
            
            try {
                const articleRefs = converted["OAI-PMH"].GetRecord.record.metadata.article.back 
                    ? converted["OAI-PMH"].GetRecord.record.metadata.article.back["ref-list"].ref
                    : undefined;

                if (articleRefs) {
                    this._parseReferences(articleRefs);
                }                                
            } catch (err2) {
                console.log('Parsing error', err2);
            }     
            //only abstract is parsed now
            /*let para = converted.article.body.p;
            this._bodyText = '';
            if (para) {
                para.forEach((p) => {
                    this._bodyText += p["#text"] + ' ';
                });
            }
            this._parseSections(converted.article.body.sec);*/
            if (this.render != null) {
                this._renderData();
            }
            this.dispatchEvent(new CustomEvent(
                'ready', {
                    detail: {
                        data: this._convertedData
                    },
                    bubbles: true,
                    cancelable: true
                }
            ));
        }
    }

    _parseSections(section) {
        if (section.length) {
            section.forEach((sec) => {
                this._bodyText += sec.title + ' '; 
                this._bodyText += this._parseParagraph(sec.p); 
                let subsec = sec.sec;
                if (subsec) {
                    this._parseSections(subsec);
                }
            });
        } else {
            this._bodyText += this._parseParagraph(section.p); 
        }
    }

    _parseArticle(data) {
        this._convertedData = clone(template, true);        
        data = data["article-meta"];

        //metadata
        const now = new Date();
        this._convertedData.dateCreated = now.toISOString().split('T')[0];
        this._convertedData.sdPublisher = this.publisher;
        this._convertedData.version = this.version;

        //data
        this._convertedData.mainEntity.headline = data["title-group"]["article-title"];
        if (data.permissions && data.permissions["license"]) {
            this._convertedData.mainEntity.license = data.permissions["license"]["@_xlink:href"]
        }
        this._convertedData.mainEntity.pageStart = data.fpage;
        this._convertedData.mainEntity.pageEnd = data.lpage;  
        if (data["ext-link"]) {
            this._convertedData.mainEntity.sameAs.push(data["ext-link"]["@_xlink:href"]);
        }
        
        this._parseArticleIds(data);
        this._parseArticleDates(data);
        this._parseArticleAuthors(data);
        this._parseArticleAbstract(data);        
    }

    _parseArticleIds(data) {
        data["article-id"].forEach((el) => {
            if (el["@_pub-id-type"] === 'doi') {
                this._convertedData.mainEntity["@id"] += el["#text"];
                this._convertedData.mainEntity.url = this._convertedData.mainEntity["@id"];
                this._convertedData.mainEntity.identifier += el["#text"];
            } else if (el["@_pub-id-type"] === 'pmcid') {
                this._convertedData.identifier += el["#text"];
                this._convertedData.mainEntity.alternateName.push(el["@_pub-id-type"] + ':' + el["#text"]);
                this._convertedData.mainEntity.sameAs.push('http://www.ncbi.nlm.nih.gov/pmc/articles/' + el["#text"]);
                if (this.metadataid) {
                    this._convertedData["@id"] = this.metadataid.replace('{0}', el["#text"]);
                }
            } else if (el["@_pub-id-type"] === 'pmc-uid') {                
                this._convertedData.isBasedOn = 'https://www.ncbi.nlm.nih.gov/pmc/oai/oai.cgi?verb=GetRecord&identifier=oai:pubmedcentral.nih.gov:' + el["#text"] + '&metadataPrefix=pmc_fm';
                this._convertedData.mainEntity.alternateName.push(el["@_pub-id-type"] + ':' + el["#text"]);
            } else if (el["@_pub-id-type"] === 'pmid') {
                this._convertedData.sameAs.push('http://bio2rdf.org/pubmed:' + el["#text"]);
                this._convertedData.sameAs.push('http://identifiers.org/pubmed/' + el["#text"]);
                this._convertedData.mainEntity.sameAs.push('http://info.identifiers.org/pubmed/' + el["#text"]);
                this._convertedData.mainEntity.sameAs.push('https://www.ncbi.nlm.nih.gov/pubmed/' + el["#text"]);
                this._convertedData.mainEntity.alternateName.push(el["@_pub-id-type"] + ':' + el["#text"]);
            } else {
                this._convertedData.mainEntity.alternateName.push(el["@_pub-id-type"] + ':' + el["#text"]);
            }
        });
    }

    _parseArticleDates(data) {
        data["pub-date"].some((el) => {
            if (el["@_pub-type"] === 'epub') {
                this._convertedData.mainEntity.datePublished = el.year + '-' + el.month + '-' + el.day;
            } else if ((el["@_pub-type"] === 'ppub') && (this._convertedData.mainEntity.datePublished === '')){
                this._convertedData.mainEntity.datePublished = el.year + '-' + el.month + '-' + el.day;
            }
            return el["@_pub-type"] === 'epub';
        });
    }

    _parseArticleAuthors(data) {
        if (data["contrib-group"].contrib.length) {
            data["contrib-group"].contrib.forEach((el) => {                
                this._createAuthor(el);
            });
        } else {
            this._createAuthor(data["contrib-group"].contrib);
        }
    }

    _createAuthor(el) {
        if (el["@_contrib-type"] === 'author') {
            let myAuthor = clone(author, true);
            myAuthor.givenName = el.name["given-names"];
            myAuthor.familyName = el.name.surname;
            myAuthor.name = myAuthor.givenName + ' ' + myAuthor.familyName;
            this._convertedData.mainEntity.author.push(myAuthor);
        }
    }
        
    _parseArticleAbstract(data) {
        if (data.abstract) {
            if (data.abstract.sec) {//sections
                data.abstract.sec.forEach((el) => {
                    this._convertedData.mainEntity.backstory += el.title +': ';
                    this._convertedData.mainEntity.backstory += this._parseParagraph(el.p);
                });
            } else if (data.abstract.length) { //paragraphs
                data.abstract.forEach((el) => {
                    this._convertedData.mainEntity.backstory += this._parseParagraph(el);
                });
            } else { //only one paragraph
                this._convertedData.mainEntity.backstory += this._parseParagraph(data.abstract);
            }
        }
    }                

    _parseParagraph(para) {
        let paraText = '';
        if (para) {
            if (typeof para === 'string') {
                paraText += para + ' ';
            } else {
                if (para.length) {             
                    para.forEach((p) => {
                        paraText += p["#text"] + ' ';
                    });
                } else {
                    if (para.p) {
                        paraText += para.p["#text"] + ' ';
                    } else {
                        paraText += para["#text"] + ' ';
                    }                    
                }                
            }            
        }
        return paraText;
    }

    _parseJournal(data) {
        let myJournal;
        let myVol = clone(volJournal, true);
        myVol.volumeNumber = data["article-meta"].volume;        
        myVol.isPartOf.name = data["journal-meta"]["journal-title"] ?
            data["journal-meta"]["journal-title"] 
            : data["journal-meta"]["journal-title-group"]["journal-title"];
        if (data["journal-meta"].issn.length) {
            data["journal-meta"].issn.forEach((element) => {
                myVol.isPartOf.issn.push(element["#text"]);    
            });
        } else {
            myVol.isPartOf.issn = data["journal-meta"].issn["#text"];
        }
        if (data["journal-meta"].publisher) {
            myVol.isPartOf.publisher.name = data["journal-meta"].publisher["publisher-name"];
        } else {
            delete myVol.isPartOf.publisher;
        }
        myJournal = myVol;
        if (data["article-meta"].issue) {
            let myIssue = clone(issue, true);
            myIssue.issueNumber = data["article-meta"].issue;
            myIssue.isPartOf = myVol;
            myJournal = myIssue;
        }
        this._convertedData.mainEntity.isPartOf = myJournal;
    }

    _parseReferences(data) {
        this._convertedData.mainEntity.citation = [];        
        data.forEach((ref) => {            
            if (ref.citation["pub-id"]) {
                let citing = clone(citation, true); 
                if (ref.citation["pub-id"].length) {                      
                    ref.citation["pub-id"].forEach((el) => {
                        this._parseRefIds(citing, el);  
                    });
                } else { 
                    this._parseRefIds(citing, ref.citation["pub-id"]);                      
                }
                this._convertedData.mainEntity.citation.push(citing);
            }         
        });
    }

    _parseRefIds(citing, el) {                
        if (el["@_pub-id-type"] === 'doi') {
            citing["@id"] = 'https://doi.org/' + el["#text"];
            citing.url = citing["@id"];
            citing.identifier = 'doi:' + el["#text"];
        } else if (el["@_pub-id-type"] === 'pmid') {            
            citing.sameAs = [];
            citing.sameAs.push('http://info.identifiers.org/pubmed/' + el["#text"]);
            citing.sameAs.push('https://www.ncbi.nlm.nih.gov/pubmed/' + el["#text"]);
            citing.alternateName = (el["@_pub-id-type"] + ':' + el["#text"]);
        } //TODO: link to dataset if pmid mapping to pmc exists        
    }

    _renderData() {        
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.innerHTML = JSON.stringify(this._convertedData, null, 2);
        document.body.appendChild(s);        
    }    
}

customElements.define("biotea-bioschemas-metadata", BioteaBioschemasMetadata);
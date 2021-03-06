/*!
 * ${copyright}
 */

sap.ui.define(['jquery.sap.global', 'sap/ui/Device',
		'sap/ui/core/Component', 'sap/ui/core/ComponentContainer', 'sap/ui/core/HTML', 'sap/ui/core/UIComponent', 'sap/ui/core/mvc/Controller', 'sap/ui/core/routing/History',
		'sap/ui/model/json/JSONModel',
		'sap/m/library', 'sap/m/Text',
		'../util/ToggleFullScreenHandler',
		'../data'
	],
	function (jQuery, Device,
		Component, ComponentContainer, HTML, UIComponent, Controller, History,
		JSONModel,
		mobileLibrary, Text,
		ToggleFullScreenHandler, data) {

	"use strict";

		var SampleController = Controller.extend("sap.ui.demokit.explored.view.sample", {

			onInit : function () {
				this.router = UIComponent.getRouterFor(this);
				this.router.attachRoutePatternMatched(this.onRouteMatched, this);
				this._viewModel = new JSONModel({
					showNavButton : true,
					showNewTab: false
				});
				this.getView().setModel(this._viewModel);
			},

			onRouteMatched : function (oEvt) {

				if (oEvt.getParameter("name") !== "sample") {
					return;
				}

				var oModelData = this._viewModel.getData();
				this._sId = oEvt.getParameter("arguments").id;

				// retrieve sample object
				var oSample = data.samples[this._sId];
				if (!oSample) {
					this.router.myNavToWithoutHash("sap.ui.demokit.explored.view.notFound", "XML", false, { path: this._sId });
					return;
				}

				// set nav button visibility
				var oPage = this.getView().byId("page");
				var oHistory = History.getInstance();
				var oPrevHash = oHistory.getPreviousHash();
				oModelData.showNavButton = Device.system.phone || !!oPrevHash;
				oModelData.previousSampleId = oSample.previousSampleId;
				oModelData.nextSampleId = oSample.nextSampleId;

				// set page title
				oPage.setTitle("Sample: " + oSample.name);

				try {
					var oContent = this._createComponent();
				} catch (ex) {
					oPage.removeAllContent();
					oPage.addContent(new Text({ text : "Error while loading the sample: " + ex }));
					return;
				}

				//get config
				var oConfig = (this._oComp.getMetadata()) ? this._oComp.getMetadata().getConfig() : null;
				var oSampleConfig = oConfig && oConfig.sample || {};

				// only have the option to run standalone if there is an iframe
				oModelData.showNewTab = !!oSampleConfig.iframe;

				if (oSampleConfig.iframe) {
					oContent = this._createIframe(oSampleConfig.iframe);
				} else {
					this.sIFrameUrl = null;
				}

				// handle stretch content
				var bStretch = !!oSampleConfig.stretch;
				var sHeight = bStretch ? "100%" : null;
				oPage.setEnableScrolling(!bStretch);
				if (oContent.setHeight) {
					oContent.setHeight(sHeight);
				}
				// add content
				oPage.removeAllContent();
				oPage.addContent(oContent);

				// scroll to top of page
				oPage.scrollTo(0);
				this._viewModel.setData(oModelData);
			},

			onNewTab : function () {
				mobileLibrary.URLHelper.redirect(this.sIFrameUrl, true);
			},

			onPreviousSample: function (oEvent) {
				this.router.navTo("sample", {
					id: this._viewModel.getProperty("/previousSampleId")
				}, true);
			},

			onNextSample: function (oEvent) {
				this.router.navTo("sample", {
					id: this._viewModel.getProperty("/nextSampleId")
				}, true);
			},

			_createIframe : function (vIframe) {
				var sSampleId = this._sId;

				if (typeof vIframe === "string") {
					this.sIFrameUrl = SampleController._createIFrameURL(vIframe, sSampleId);
				} else {
					jQuery.sap.log.error("no iframe source was provided");
					return;
				}

				// destroy previous sample iframe
				var oHtmlControl = sap.ui.getCore().byId("sampleFrame");
				if (oHtmlControl) {
					oHtmlControl.destroy();
				}

				oHtmlControl = new HTML({
					id : "sampleFrame",
					content : '<iframe src="' + this.sIFrameUrl + '" id="sampleFrame" frameBorder="0"></iframe>'
				}).addEventDelegate({
					onAfterRendering : function () {
						oHtmlControl.$().on("load", function () {
							var oSampleFrame = oHtmlControl.$()[0].contentWindow;

							oSampleFrame.sap.ui.getCore().attachInit(function() {
								var oSampleFrame = oHtmlControl.$()[0].contentWindow;
								oSampleFrame.sap.ui.getCore().applyTheme(sap.ui.getCore().getConfiguration().getTheme());
								oSampleFrame.jQuery('body').toggleClass("sapUiSizeCompact", jQuery("body").hasClass("sapUiSizeCompact")).toggleClass("sapUiSizeCozy", jQuery("body").hasClass("sapUiSizeCozy"));
							});
						});
					}
				});

				return oHtmlControl;

			},

			_createComponent : function () {
				// create component only once
				var sCompId = 'sampleComp-' + this._sId;
				var sCompName = this._sId;

				this._oComp = sap.ui.component(sCompId);

				if (this._oComp) {
					this._oComp.destroy();
				}

				this._oComp = sap.ui.getCore().createComponent({
					id : sCompId,
					name : sCompName
				});
				// create component container
				return new ComponentContainer({
					component: this._oComp
				});
			},

			onNavBack : function (oEvt) {
				if (this._oComp && this._oComp.exit) {
					this._oComp.exit();
				}
				this.router.myNavBack("home", {});
			},

			onNavToCode : function (evt) {
				this.router.navTo("code", {
					id : this._sId
				}, false);
			},

			onToggleFullScreen : function (oEvt) {
				ToggleFullScreenHandler.updateMode(oEvt, this.getView());
			}
		});

	var R_EXTRACT_FILENAME = /\/([^\/]*)$/,// extracts everything after the last slash (e.g. some/path/index.html -> index.html)
		R_STRIP_UI5_ENDING = /\..+$/;// removes everything after the first dot in the filename (e.g. someFile.qunit.html -> .qunit.html)

	SampleController._createIFrameURL = function (sIFrameUrl, sSampleId) {
		// strip the file extension to be able to use jQuery.sap.getModulePath
		var aFileNameMatches = R_EXTRACT_FILENAME.exec(sIFrameUrl);
		var sFileName = (aFileNameMatches && aFileNameMatches.length > 1 ? aFileNameMatches[1] : sIFrameUrl);
		var sFileEnding = R_STRIP_UI5_ENDING.exec(sFileName)[0];
		var sIframeWithoutUI5Ending = sIFrameUrl.replace(R_STRIP_UI5_ENDING, "");

		// combine namespace with the file name again
		sIframeWithoutUI5Ending = jQuery.sap.getModulePath(sSampleId + "." + sIframeWithoutUI5Ending, sFileEnding || ".html");

		// construct iFrame URL based on the index file and the current query parameters
		var sSearch = window.location.search,
			sThemeUrlParameter = "sap-ui-theme=" + sap.ui.getCore().getConfiguration().getTheme();

		// applying the theme after the bootstrap causes flickering, so we inject a URL parameter
		// to override the bootstrap parameter of the iFrame example
		if (sSearch) {
			var oRegExp = /sap-ui-theme=[a-z0-9\-\_]+/;
			if (sSearch.match(oRegExp)) {
				sSearch = sSearch.replace(oRegExp, sThemeUrlParameter);
			} else {
				sSearch += "&" + sThemeUrlParameter;
			}
		} else {
			sSearch = "?" + sThemeUrlParameter;
		}

		if (sIFrameUrl.indexOf("?") > -1) {
			sSearch = sSearch.replace("?",  "&");
		}

		return sIframeWithoutUI5Ending + sSearch;
	};
	return SampleController;
});

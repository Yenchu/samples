/* ===================================================
 * mytable.js v0.1.2
 * https://github.com/Yenchu/mytable
 * =================================================== */

!function($) {
	
	"use strict";

	var compName = 'mytable';
	
	var MyTable = function(element, options) {
		this.init(element, options);
	};
	
	MyTable.prototype = {
		
		constructor: MyTable,
		
		init: function(element, options) {
			this.$element = $(element);
			this.options = $.extend(true, {}, $.fn.mytable.defaults, options);
			this.namespace = compName, this.colModels = this.options.colModels, this.remote = this.options.remote || {};
			
			// disable multi-select when using restful api
			this.remote.isRest && (this.options.isMultiSelect = false);
			
			this.rowDataMap = {}, this.selRowIds = [], this.keyName, this.editedRowId, this.newRowId, this.optionsUrlCache = {};
			this.page = 0, this.pageSize = 0, this.totalPages = 0, this.totalRecords = 0, this.sortCol, this.sortDir;
			
			this.createTable();
			this.loadData();
		}
	
		, destroy: function() {
			this.$element.off('.' + this.namespace).removeData(compName).empty();
		}
		
		, enable: function() {
			this.$element.find('.btn').removeClass('disabled');
			this.addEventHandlers();
			if (this.options.isPageable) {
				this.addPagingEventHandlers();
			}
		}
		
		, disable: function() {
			this.$element.find('.btn').addClass('disabled');
			this.$element.off('.' + this.namespace);
		}
		
		, createTable: function() {
			this.findKeyName();
			this.createHeader();
			this.addEventHandlers();
			
			if (this.options.isPageable) {
				this.createPager();
				this.addPagingEventHandlers();
			}
			
			var e = $.Event('created');
			this.$element.trigger(e);
		}
		
		, findKeyName: function() {
			// find key name
			var colLen = this.colModels.length;
			for (var i = 0; i < colLen; i++) {
				var colModel = this.colModels[i];
				if (colModel.key) {
					this.keyName = colModel.name;
					break;
				}
			}
			
			// if key name not found, use 'id' as key name
			if (!this.keyName) {
				for (var i = 0; i < colLen; i++) {
					var colModel = this.colModels[i];
					if (colModel.name === 'id') {
						this.keyName = colModel.name;
						break;
					}
				}
			}
		}
		
		, createHeader: function() {
			var colLen = this.colModels.length;
			var $tr = $('<tr/>');
			for (var i = 0; i < colLen; i++) {
				var colModel = this.colModels[i];
				if (colModel.hidden) {
					continue;
				}
				
				var style = '';
				colModel.width && (style += 'width:' + colModel.width + ';');
				colModel.sortable && (style += 'cursor:pointer;');
				style !== '' && (style = ' style="' + style + '"');

				var header = colModel.header;
				var thContent;
				if (header) {
					if (typeof header === 'function') {
						thContent = header(colModel);
					} else {
						thContent = header;
					}
				} else {
					thContent = '';
				}
				var $th = $('<th' + style + '>' + thContent + '</th>');
				
				$th.data('name', colModel.name);
				$tr.append($th);
			}
			var $thead = $('<thead class="table-header"/>').appendTo(this.$element);
			$thead.html($tr);
		}
		
		, createPager: function() {
			var pagerElemName = this.options.pagerLocation === 'top' ? 'thead' : 'tfoot';
			var $pager = $('<' + pagerElemName + ' class="paging-bar"/>');
			
			// check pager location: thead or tfoot
			var isDropup;
			if (pagerElemName === 'thead') {
				 $pager.prependTo(this.$element);
				 isDropup = false;
			} else {
				$pager.appendTo(this.$element);
				isDropup = true;
			}
			
			var pageRangeTpl = this.getPageRangeTemplate(this.options.pageRangeTemplate, isDropup);
			var pagingBtnsTpl = this.getPagingBtnsTemplate(this.options.pagingTemplate, isDropup);
			
			var colspan = 0;
			for (var i = 0, len = this.colModels.length; i < len; i++) {
				!this.colModels[i].hidden && colspan++;
			}
			var tr = '<tr><td colspan="' + colspan + '">' + pageRangeTpl + pagingBtnsTpl + '</td></tr>';
			$pager.html(tr);
			
			this.setPageSizeElement();
			this.setGotoPageElement();
		}
	
		, getPageRangeTemplate: function(tpl, isDropup) {
			tpl = tpl.replace('{{fromRecord}}', '<span class="from-record"></span>');
			tpl = tpl.replace('{{toRecord}}', '<span class="to-record"></span>');
			tpl = tpl.replace('{{totalRecords}}', '<span class="total-records"></span>');
			
			var dropup = isDropup ? ' dropup' : '';
			tpl = tpl.replace('{{pageSize}}', ' <div class="btn-group' + dropup + '"><a class="btn dropdown-toggle page-size" data-toggle="dropdown" href="#"><span class="page-size-value"></span> <span class="caret"></span></a><ul class="dropdown-menu page-size-options"></ul></div>');
			return tpl;
		}
	
		, getPagingBtnsTemplate: function(tpl, isDropup) {
			var active = this.options.classes.activePagingBtn;
			tpl = tpl.replace('{{firstButton}}', '<span class="btn-group"><a class="btn goto-first-page" href="#"><i class="icon-fast-backward icon-white"></i></a>');
			tpl = tpl.replace('{{prevButton}}', '<a class="btn goto-prev-page" href="#"><i class="icon-step-backward icon-white"></i></a></span>');
			
			var dropup = isDropup ? ' dropup' : '';
			tpl = tpl.replace('{{currentPage}}', '<div class="btn-group' + dropup + '"><a class="btn dropdown-toggle current-page" data-toggle="dropdown" href="#"><span class="current-page-value"></span> <span class="caret"></span></a><div class="dropdown-menu goto-page"></div></div>');
			
			tpl = tpl.replace('{{totalPages}}', '<span class="total-pages"></span>');
			tpl = tpl.replace('{{nextButton}}', '<span class="btn-group"><a class="btn ' + active + ' goto-next-page" href="#"><i class="icon-step-forward icon-white"></i></a>');
			tpl = tpl.replace('{{lastButton}}', '<a class="btn ' + active + ' goto-last-page" href="#"><i class="icon-fast-forward icon-white"></i></a></span>');
			return tpl;
		}
		
		, setPageSizeElement: function() {
			var options = this.options;
			var sizeOptions = '';
			for (var i = 0, len = options.pageSizeOptions.length; i < len; i++) {
				sizeOptions += '<li><a href="#">' + options.pageSizeOptions[i] + '</a></li>';
			}
			this.$element.find('.page-size-options').html(sizeOptions);
		}
		
		, setGotoPageElement: function() {
			this.$element.find('.goto-page').html(this.options.gotoPageTemplate);
		}
		
		, hideGotoPageElement: function() {
			$('.current-page').dropdown('toggle');
		}
		
		, loadData: function() {
			var options = this.options;
			if (options.localData) {
				this.parseData(options.localData);
			} else {
				this.loadRemoteData();
			}
		}
		
		, loadRemoteData: function() {
			// clear cache when loading data from remote
			this.optionsUrlCache = {};
			
			var options = this.options;
			var remote = this.remote;
			var url = remote.url;
			var type = remote.method || 'GET';
			var data = remote.params || {};
			
			if (!options.loadOnce && options.isPageable) {
				var paramNames = options.paramNames;
				data[paramNames.page] = this.page || 0;
				data[paramNames.pageSize] = this.pageSize || options.pageSizeOptions[0];
				data[paramNames.sort] = this.sortCol;
				data[paramNames.sortDir] = this.sortDir;
			}
			
			var that = this;
			this.startLoading();
			$.ajax({
				url: url,
				data: data,
				type: type
			}).always(function() {
				that.stopLoading();
			}).done(function(resps) {
				that.parseData(resps);
			}).fail(function() {
				$.error('Loading data from remote failed!');
				var e = $.Event('remoteLoadError');
				that.$element.trigger(e);
			});
		}
		
		, startLoading: function() {
			var $element = this.$element, $placeholder = this.$element.parent() || $(document.body);
			$placeholder.find('.loading-bar').remove();
			this.disable();
			
			var $loadindBar = $(this.options.loadingBarTemplate);
			$loadindBar.appendTo($placeholder);

			var $progress = $loadindBar.find('.progress'), barW, barH;
			if ($progress) {
				barW = $progress.width() / 2 + 24, barH = $progress.height() / 2;
			} else {
				barW = $loadindBar.width() / 2, barH = $loadindBar.height() / 2;
			}
			var x = $element.offset().left + ($element.width() / 2) - barW, 
				y = $element.offset().top + ($element.height() / 2) - barH;
			$loadindBar.offset({top:y, left:x});
		}
		
		, stopLoading: function() {
			var $placeholder = this.$element.parent() || $(document.body);
			$placeholder.find('.loading-bar').remove();
			this.enable();
		}
		
		, parseData: function(json) {
			var options = this.options;
			var paramNames = options.paramNames;
			var rowDataSet = json[paramNames.records];
			
			if (options.isPageable) {
				this.totalRecords = json[paramNames.totalRecords] || rowDataSet.length;
				this.pageSize = json[paramNames.pageSize] || this.pageSize || options.pageSizeOptions[0];
				this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
				this.page = json[paramNames.page] || this.page || 0;
				
				if (this.page < 0) {
					this.page = 0;
				} else if (this.page > 0 && this.page >= this.totalPages) {
					this.page = this.totalPages - 1;
				}
			}
			
			this.setRowDataMap(rowDataSet);
			this.load();
		}
		
		, addEventHandlers: function() {
			var that = this, $element = this.$element, options = this.options, ns = this.namespace;

			$(document).off('click.' + ns).on('click.' + ns, function(e) {
				if (that.isFocusout(e)) {
					that.clearSelectedRow();
					var e = $.Event('blur');
					that.$element.trigger(e);
				}
			});
			
			$(document).off('keyup.' + ns).on('keyup.' + ns, function(e) {
				var key = e.keyCode || e.charCode;
				if (options.inlineEditing && that.editedRowId) {
					if (key === 13) { // Enter key
						that.saveRow(that.editedRowId);
					} else if (key === 27) { // Esc key
						that.restoreRow(that.editedRowId);
					}
				}
			});
			
			$element.off('click.th.' + ns).on('click.th.' + ns, 'th', function() {
				var colName = $(this).data('name');
				var colModel = that.getColModel(colName);
				if (colModel.sortable) {
					that.sortAndReload(colName);
					that.labelSorted($(this));
				}
			});
			
			$element.off('click.tr.' + ns).on('click.tr.' + ns, 'tbody tr', function(e) {
				var $this = $(this);
				if (!that.isSelectedRow($this)) {
					options.isMultiSelect ? that.selectRows($this, e) : that.selectRow($this, e);
				} else {
					that.selectRow($this, e);
				}
				$element.trigger({type:'clickRow', rowId:that.getRowId($(this)), orignEvent:e});
			});
			
			$element.off('dblclick.tr.' + ns).on('dblclick.tr.' + ns, 'tbody tr', function(e) {
				$element.trigger({type:'dblclickRow', rowId:that.getRowId($(this)), orignEvent:e});
			});
			
			$element.off('contextmenu.tr.' + ns).on('contextmenu.tr.' + ns, 'tbody tr', function(e) {
				$element.trigger({type:'rowContextmenu', rowId:that.getRowId($(this)), orignEvent:e});
			});
			
			$element.off('mouseenter.tr.' + ns).on('mouseenter.tr.' + ns, 'tbody tr', function() {
				$(this).addClass(options.classes.hover);
			});
			$element.off('mouseleave.tr.' + ns).on('mouseleave.tr.' + ns, 'tbody tr', function() {
				$(this).removeClass(options.classes.hover);
			});
		}
		
		, addPagingEventHandlers: function() {
			var that = this, $element = this.$element, ns = this.namespace;
			
			$element.off('click.first-page.' + ns).on('click.first-page.' + ns, '.goto-first-page', function() {
				if (that.page <= 0) {
					return;
				}
				that.page = 0;
				that.reload();
			});
			$element.off('click.prev-page.' + ns).on('click.prev-page.' + ns, '.goto-prev-page', function() {
				if (that.page <= 0) {
					return;
				}
				that.page -= 1;
				that.reload();
			});
			$element.off('click.next-page.' + ns).on('click.next-page.' + ns, '.goto-next-page', function() {
				if (that.page >= that.totalPages - 1) {
					return;
				}
				that.page += 1;
				that.reload();
			});
			$element.off('click.last-page.' + ns).on('click.last-page.' + ns, '.goto-last-page', function() {
				if (that.page >= that.totalPages - 1) {
					return;
				}
				that.page = that.totalPages - 1;
				that.reload();
			});
			
			$element.off('click.goto-page-value.' + ns).on('click.goto-page-value.' + ns, '.paging-value', function(e) {
				e.stopPropagation();
			});
			$element.off('keyup.goto-page-value.' + ns).on('keyup.goto-page-value.' + ns, '.paging-value', function(e) {
				e.stopPropagation();
				var key = e.charCode || e.keyCode;
				if (key === 13) {
					$element.find('.paging-confirm').trigger('click.goto-page-confirmed.' + that.namespace);
				} else if (key === 27) {
					that.hideGotoPageElement();
				}
			});
			$element.off('click.goto-page-confirmed.' + ns).on('click.goto-page-confirmed.' + ns, '.paging-confirm', function(e) {
				e.stopPropagation();
				var pageNo = parseInt($element.find('.paging-value').val());
				if (!pageNo || pageNo === that.page + 1) {
					that.hideGotoPageElement();
					return;
				}
				
				pageNo = (pageNo > that.totalPages ? that.totalPages : pageNo);
				pageNo = (pageNo < 1 ? 1 : pageNo);
				that.page = pageNo - 1;
				that.hideGotoPageElement();
				that.reload();
				$element.find('.paging-value').val('');
			});
			$element.off('click.goto-page-cancelled.' + ns).on('click.goto-page-cancelled.' + ns, '.paging-cancel', function(e) {
				e.stopPropagation();
				that.hideGotoPageElement();
			});
			
			$element.off('click.page-size-changed.' + ns).on('click.page-size-changed.' + ns, '.page-size-options li a', function() {
				var newPageSize = parseInt($(this).text());
				if (newPageSize === that.pageSize) {
					return;
				}
				
				that.pageSize = newPageSize;
				that.totalPages = Math.ceil(that.totalRecords / that.pageSize);
				that.page = 0;
				that.reload();
			});
		}
		
		, updatePagingButtons: function() {
			var $element = this.$element, page = this.page, totalPages = this.totalPages;
			var active = this.options.classes.activePagingBtn;
			if (page <= 0) {
				$element.find('.goto-first-page').removeClass(active).css('cursor','default');
				$element.find('.goto-prev-page').removeClass(active).css('cursor','default');
			} else {
				$element.find('.goto-first-page').toggleClass(active, true).css('cursor','pointer');
				$element.find('.goto-prev-page').toggleClass(active, true).css('cursor','pointer');
			}
			if (page >= totalPages - 1) {
				$element.find('.goto-next-page').removeClass(active).css('cursor','default');
				$element.find('.goto-last-page').removeClass(active).css('cursor','default');
			} else {
				$element.find('.goto-next-page').toggleClass(active, true).css('cursor','pointer');
				$element.find('.goto-last-page').toggleClass(active, true).css('cursor','pointer');
			}
		}

		, updatePagingElements: function() {
			var $element = this.$element, page = this.page, totalPages = this.totalPages, pageSize = this.pageSize, totalRecords = this.totalRecords;
			$element.find('.current-page-value').text((page + 1));
			$element.find('.total-pages').text(totalPages);
			
			var fromRecord = page * pageSize + 1;
			var toRecord = fromRecord + pageSize - 1;
			toRecord = toRecord >= totalRecords ? totalRecords : toRecord;
			$element.find('.from-record').text(fromRecord);
			$element.find('.to-record').text(toRecord);
			$element.find('.total-records').text(totalRecords);
			
			$element.find('.page-size-value').text(pageSize);
			this.updatePagingButtons();
		}
		
		, load: function() {
			var rowDataSet = this.getAllRowData();
			var e = $.Event('load');
			e.rowDataSet = rowDataSet;
			this.$element.trigger(e);
	        if (e.isDefaultPrevented()) {
	        	return;
	        }
			
			var rowLen = rowDataSet.length;
			if (rowLen < 1) {
				$('.paging-bar').addClass('hide');
				return;
			} else {
				var $pagingBar = $('.paging-bar');
				$pagingBar.hasClass('hide') && $pagingBar.removeClass('hide');
			}
			
			var i, len;
			if (this.options.isPageable) {
				i = this.page * this.pageSize;
				len = i + this.pageSize;
				(i < 0 || i >= rowLen) && (i = 0);
				(len < 1 || len > rowLen) && (len = rowLen);
			} else {
				i = 0;
				len = rowLen;
			}
			
			var tbodyContent = '';
			var colLen = this.colModels.length;
			for (; i < len; i++) {
				var rowData = rowDataSet[i];
				var id = rowData[this.keyName];
				
				tbodyContent += '<tr id="' + id + '">';
				for (var j = 0; j < colLen; j++) {
					var colModel = this.colModels[j];
					if (colModel.hidden) {
						continue;
					}
					
					var tdContent = this.getColContent(rowData, colModel);
					tbodyContent += '<td>' + tdContent + '</td>';
				}
				tbodyContent += '</tr>';
			}
			
			var tbody = this.$element.find('tbody')[0];
			var $tbody = tbody ? $(tbody) : $('<tbody/>').appendTo(this.$element);
			$tbody.html(tbodyContent);
			
			this.options.isPageable && this.updatePagingElements();
			
			e = $.Event('loaded');
			this.$element.trigger(e);
		}
		
		, reload: function() {
			if (this.options.localData || this.options.loadOnce) {
				this.load();
			} else {
				this.loadRemoteData();
			}
		}
		
		, sortAndReload: function(sortCol, sortDir) {
			var asc = this.options.sortDir.asc, desc = this.options.sortDir.desc;
			if (this.sortCol === sortCol) {
				this.sortDir = sortDir || this.sortDir === asc ? desc : asc;
			} else {
				this.sortCol = sortCol;
				this.sortDir = sortDir || asc;
			}
			
			if (this.options.localData || this.options.loadOnce) {
				var rowDataSet = this.getAllRowData();
				var sortedDataSet = this.sort(rowDataSet, this.sortCol, this.sortDir);
				this.setRowDataMap(sortedDataSet);
			}
			this.reload();
		}
		
		, sort: function(rowDataSet, sortCol, sortDir) {
			var that = this;
			var colModel = this.getColModel(sortCol);
			var sortFun;
			if (colModel.sorter) {
				sortFun = colModel.sorter;
			} else {
				sortFun = function(a, b) {
					var valA = that.getColValue(a, colModel) || '', valB = that.getColValue(b, colModel) || '';
					var options = that.getColOptions(colModel);
					if (options) {
						valA = options[valA] || valA;
						valB = options[valB] || valB;
					}
					if (valA < valB) {
						return -1;
					}
					if (valA > valB) {
						return 1;
					}
					return 0;
				};
			}

			rowDataSet.sort(function(a, b) {
				return sortDir === that.options.sortDir.desc ? -sortFun(a, b) : sortFun(a, b);
			});
			return rowDataSet;
		}
		
		, labelSorted: function($th) {
			$th.parent().find('span').remove();
			var sortStyle = 'sort';
			this.sortDir === this.options.sortDir.desc && (sortStyle += ' sort-desc');
			var label = ' <span class="caret ' + sortStyle + '"></span>';
			$th.append(label);
		}
		
		, setRowDataMap: function(rowDataSet) {
			this.rowDataMap = {};
			for (var i = 0, len = rowDataSet.length; i < len; i++) {
				var rowData = rowDataSet[i];
				var key = rowData[this.keyName];
				this.rowDataMap[key] = rowData;
			}
		}
		
		, getColModel: function(colName) {
			for (var i = 0, len = this.colModels.length; i < len; i++) {
				var colModel = this.colModels[i];
				if (colModel.name === colName) {
					return colModel;
				}
			}
			return null;
		}
		
		, getColContent: function(rowData, colModel) {
			var colVal = this.getColValue(rowData, colModel);//rowData[colModel.name];
			if (colModel.formatter) {
				return colModel.formatter(colVal, rowData);
			}
			
			if (colVal === undefined || colVal === null) {
				return '';
			}

			var options = this.getColOptions(colModel);
			if ($.isArray(colVal)) {
				if (colVal.length < 1) {
					return '';
				}
				
				var rtVals = [];
				var isObj = colVal[0] instanceof Object ? true : false;
				var subName = colModel['subName'] || options ? 'id' : 'name';
				for (var i = 0, len = colVal.length; i < len; i++) {
					var rtVal = isObj ? colVal[i][subName] : colVal[i];
					if (options) {
						rtVals.push(options[rtVal] || rtVal);
					} else {
						rtVals.push(rtVal);
					}
				}
				return rtVals.join('<br/>');
			}
			if (options) {
				return options[colVal] || colVal;
			}
			return colVal;
		}
		
		, getColValue: function(rowData, colModel) {
			if (colModel.name.indexOf('.') >= 0) {
				var names = colModel.name.split('.');
				var data = rowData[names[0]];
				for (var i = 1, len = names.length; i < len; i++) {
					data = data[names[i]];
				}
				return data;
			} else {
				return rowData[colModel.name];
			}
		}
		
		, getColOptions: function(colModel) {
			var options = colModel.options;
			if (!options && colModel.optionsUrl) {
				var name = colModel.name;
				var cachedOptions = this.optionsUrlCache[name];
				if (cachedOptions) {
					return cachedOptions;
				}
				
				var that = this;
				$.ajax({
					url: colModel.optionsUrl,
					async: false
				}).done(function(resp) {
					options = resp;
					that.optionsUrlCache[name] = options;
				}).fail(function() {
					$.error('Loading options data from remote failed!');
				});
			}
			return options;
		}
		
		, getHeader: function() {
			var header = this.$element.find('.table-header')[0];
			return $(header);
		}
		
		, selectRow: function($selRow, e) {
			this.clearSelectedRow();
			this.addSelectedRow($selRow);
		}
		
		, selectRows: function($selRow, e) {
			if (e.ctrlKey) {
				this.addSelectedRow($selRow);
			} else if (e.shiftKey) {
				var lastSelRowId = this.getSelectedRowId();
				if (!lastSelRowId) {
					this.addSelectedRow($selRow);
					return;
				}
				
				this.clearSelectedRow();
				var currSelRowId = this.getRowId($selRow);
				
				var enabledSelect = false;
				var rowElems = this.$element.find('tbody tr');
				for (var i = 0, len = rowElems.length; i < len; i++) {
					var $row = $(rowElems[i]);
					var rowId = this.getRowId($row);
					if (rowId === lastSelRowId) {
						this.addSelectedRow($row);
						if (enabledSelect) {
							break;
						} else {
							enabledSelect = true;
							continue;
						}
					}
					if (rowId === currSelRowId) {
						this.addSelectedRow($row);
						if (enabledSelect) {
							break;
						} else {
							enabledSelect = true;
							continue;
						}
					}
					if (enabledSelect) {
						this.addSelectedRow($row);
						continue;
					}
				}
			} else {
				this.clearSelectedRow();
				this.addSelectedRow($selRow);
			}
		}
		
		, clearSelectedRow: function() {
			if (this.selRowIds.length === 0) {
				return;
			}
			for (var i = 0, len = this.selRowIds.length; i < len; i++) {
				var selRowId = this.selRowIds[i];
				var $row = $('[id="' + selRowId + '"]');
				$row.removeClass(this.options.classes.highlight);
			}
			this.selRowIds = [];
		}
		
		, addSelectedRow: function($row) {
			this.highlightSelectedRow($row);
			this.selRowIds.push(this.getRowId($row));
		}
		
		, highlightSelectedRow: function($row) {
			!$row.hasClass(this.options.classes.highlight) && $row.addClass(this.options.classes.highlight);
			$row.removeClass(this.options.classes.hover);
		}
		
		, isSelectedRow: function($row) {
			var rowId = this.getRowId($row);
			for (var i = 0, len = this.selRowIds.length; i < len; i++) {
				var selRowId = this.selRowIds[i];
				if (selRowId === rowId) {
					return true;
				}
			}
			return false;
		}
		
		, getRow: function(rowId) {
			var rowElems = this.$element.find('tbody tr');
			for (var i = 0, len = rowElems.length; i < len; i++) {
				var $row = $(rowElems[i]);
				if (this.getRowId($row) == rowId) {
					return $row;
				}
			}
			return null;
		}
		
		, getFirstRow: function() {
			var rowElem = this.$element.find('tbody tr:first-child');
			return $(rowElem);
		}
		
		, getRowId: function($row) {
			return $row.attr('id');
		}
		
		, getSelectedRowId: function() {
			var selRowId = this.selRowIds.length > 0 ? this.selRowIds[this.selRowIds.length - 1] : null;
			return selRowId;
		}
		
		, getSelectedRowIds: function() {
			return this.selRowIds;
		}
		
		, getRowData: function(rowId) {
			return this.rowDataMap[rowId];
		}
		
		, getSelectedRowData: function() {
			if (this.selRowIds.length < 1) {
				return null;
			}
			
			var rowId = this.selRowIds[this.selRowIds.length - 1];
			return this.rowDataMap[rowId];
		}
		
		, getMultiSelectedRowData: function() {
			if (this.selRowIds.length < 1) {
				return null;
			}
			
			var rowDataSet = [];
			for (var i = 0, len = this.selRowIds.length; i < len; i++) {
				var rowId = this.selRowIds[i];
				var rowData = this.rowDataMap[rowId];
				rowDataSet.push(rowData);
			}
			return rowDataSet;
		}
		
		, getAllRowData: function() {
			var rowDataSet = [];
			for(var key in this.rowDataMap) {
				var rowData = this.rowDataMap[key];
				rowDataSet.push(rowData);
			}
			return rowDataSet;
		}
		
		, isAddingRow: function(rowId) {
			return this.newRowId == rowId ? true : false;
		}
		
		, addRow: function(initData) {
			if (this.options.localData) {
				return;
			}
			
			initData = initData || {};
			this.newRowId = initData[this.keyName] || '0'; // new record with default id '0'
			if (!this.options.inlineEditing) {
				this.enableFormEditing(this.newRowId, initData);
				return;
			}
			
			// avoid calling addRow repeatly
			if (this.isAddingRow(this.editedRowId)) {
				return;
			}
			
			this.restoreRow(this.editedRowId);
			this.editedRowId = this.newRowId;
			
			var $newRow = $('<tr id="' + this.newRowId + '"/>');
			var tbody = this.$element.find('tbody')[0];
			$(tbody).prepend($newRow);
			this.highlightSelectedRow($newRow);
			
			for (var i = 0, len = this.colModels.length; i < len; i++) {
				var colModel = this.colModels[i];
				if (colModel.hidden) {
					continue;
				}
				
				var $col = $('<td/>').appendTo($newRow);
				if (colModel.editable) {
					var colVal = initData[colModel.name] || '';
					var editor = this.getEditor(colVal, colModel);
					$col.html(editor);
				}
			}
		}
		
		, updateRow: function(rowId) {
			if (this.options.localData) {
				return;
			}
			
			if (!rowId) {
				return;
			}
			
			var rowData = this.getRowData(rowId);
			if (!this.options.inlineEditing) {
				this.enableFormEditing(rowId, rowData);
				return;
			}
			
			this.restoreRow(this.editedRowId);
			this.editedRowId = rowId;
			
			var $row = this.getRow(rowId);
			var colElems = $row.find('td');
			var colIdx = -1;
			var hiddenElems = '';
			
			for (var i = 0, len = this.colModels.length; i < len; i++) {
				var colModel = this.colModels[i];
				var colVal = this.getColValue(rowData, colModel) || '';
				
				// keep hidden column but set it uneditable for sending it to server
				if (colModel.hidden) {
					hiddenElems += this.getHiddenElement(colModel, colVal);
					continue;
				}
				
				colIdx++;
				if (!colModel.editable) {
					hiddenElems += this.getHiddenElement(colModel, colVal);
					continue;
				}

				var $col = $(colElems[colIdx]);
				var editor = this.getEditor(colVal, colModel);
				$col.html(editor);
			}
			
			// append hidden elements to the last column
			hiddenElems != '' && ($(colElems[colIdx]).append(hiddenElems));
		}
		
		, restoreRow: function(rowId) {
			if (this.options.localData || !this.options.inlineEditing) {
				return;
			}

			!rowId && (rowId = this.editedRowId);
			if (!rowId) {
				return;
			}
			this.editedRowId = null;
			
			var $row = this.getRow(rowId);
			if (!$row) {
				return;
			}
			this.doRestoreRow(rowId, $row);
		}
		
		, doRestoreRow: function(rowId, $row) {
			if (this.isAddingRow(rowId)) {
				$row.remove();
				return;
			}
			
			var rowData = this.getRowData(rowId);
			var colElems = $row.find('td');
			var colIdx = -1;
			for (var i = 0, len = this.colModels.length; i < len; i++) {
				var colModel = this.colModels[i];
				if (colModel.hidden) {
					continue;
				}
				
				colIdx++;
				var colContent = this.getColContent(rowData, colModel);
				$(colElems[colIdx]).html(colContent);
			}
		}
		
		, saveRow: function(rowId) {
			if (this.options.localData || !this.options.inlineEditing) {
				return;
			}
			
			!rowId && (rowId = this.editedRowId);
			if (!rowId) {
				return;
			}
			this.editedRowId = null;

			var $row = this.getRow(rowId);
			if (!$row) {
				return;
			}
			
			var $form = $('<form/>');
			$row.find('input, select, textarea').appendTo($form);
			if ($form.find('[name="' + this.keyName + '"]').length < 1) {
				$form.append('<input type="hidden" name="' + this.keyName + '" value="' + rowId + '" >');
			}
			this.doSaveRow(rowId, $form);
			this.doRestoreRow(rowId, $row);
		}
		
		, deleteRow: function(settings) {
			if (this.options.localData) {
				return;
			}
			
			settings = settings || {separator:','};
			var rowId = settings[this.keyName];
			if (!rowId || rowId.length < 1) {
				return;
			}
			
			var rowIds;
			if ($.isArray(rowId)) {
				rowIds = rowId;
			} else {
				rowIds = [rowId];
			}
			
			var displayItems;
			if (settings.displayColName) {
				displayItems = [];
				for (var i = 0, len = rowIds.length; i < len; i++) {
					var rowData = this.getRowData(rowIds[i]);
					var colModel = this.getColModel(settings.displayColName);
					var content = this.getColContent(rowData, colModel);
					displayItems.push(content);
				}
			} else {
				displayItems = rowIds;
			}

			var content = this.options.texts.deleteRowSubject + '<br/>' + '<ul><li>' + displayItems.join('</li><li>') + '</li></ul>';
			var $modal = this.getEditingModal();
			$modal.find('.modal-header .editing-title').html(this.options.texts.deleteRowTitle);
			$modal.find('.modal-body').empty().append(content);
			$modal.modal('show');
			
			var that = this;
			$modal.find('.editing-submit').off('click').on('click', function(e) {
				if (that.remote.isRest) {
					that.doDeleteRow(rowId);
				} else {
					that.doDeleteRow(rowIds, settings.separator);
				}
				$modal.modal('hide');
			});
		}
		
		, doSaveRow: function(rowId, $form) {
			var isRest = this.remote.isRest;
			var action = this.isAddingRow(rowId)? 'add' : 'update';
			
			var e = $.Event(action);
			e.form = $form;
			this.$element.trigger(e);
			if (e.isDefaultPrevented()) {
				this.loadRemoteData();
				return;
			}
			
			var url, type;
			if (isRest) {
				if (action == 'update') {
					url = this.addIdToUrl(this.remote.url, rowId);
					type = 'PUT';
				} else {
					url = this.remote.url;
					type = 'POST';
				}
			} else {
				url = $form.attr('action') || this.remote.editUrl;
				type = $form.attr('method') || 'POST';
			}

			var that = this;
			$.ajax({
				url: url,
				data: $form.serialize(),
				type: type
			}).done(function(resp) {
				e = that.isAddingRow(rowId) ? $.Event('added') : $.Event('updated');
				e.response = resp;
				that.$element.trigger(e);
				if (!e.isDefaultPrevented()) {
					that.loadRemoteData();
				}
			}).fail(function() {
				$.error(action + ' operation failed!');
				e = $.Event(action + 'Error');
				that.$element.trigger(e);
			});
		}
		
		, doDeleteRow: function(rowId, separator) {
			var isRest = this.remote.isRest, toDelId;
			
			var e = $.Event('delete'), params = {};
			toDelId = isRest ? rowId : rowId.join(separator || ',');
			params[this.keyName] = toDelId;
			e.params = params;
			this.$element.trigger(e);
			if (e.isDefaultPrevented()) {
				this.loadRemoteData();
				return;
			}
			
			var url, data, type;
			if (isRest) {
				url = this.addIdToUrl(this.remote.url, toDelId);
				data = {};
				type = 'DELETE';
			} else {
				url = this.remote.deleteUrl;
				data = params;
				type = 'POST';
			}
			
			var that = this;
			$.ajax({
				url: url,
				data: data,
				type: type 
			}).done(function(resp) {
				e = $.Event('deleted');
				e.response = resp;
				that.$element.trigger(e);
				if (!e.isDefaultPrevented()) {
					that.loadRemoteData();
				}
			}).fail(function() {
				$.error('Delete operation failed!');
				e = $.Event('deletError');
				that.$element.trigger(e);
			});
		}
		
		, addIdToUrl: function(url, id) {
			var idx = url.indexOf('?');
			if (idx > 0) {
				var qryStr = url.substring(idx + 1);
				url = url.substring(0, idx);
				url = url.charAt(url.length - 1) == '/' ? url + id : url + '/' + id;
				url += '?' + qryStr;
			} else {
				url = url.charAt(url.length - 1) == '/' ? url + id : url + '/' + id;
			}
			return url;
		}
		
		, enableFormEditing: function(rowId, rowData) {
			var title = this.isAddingRow(rowId) ? this.options.texts.addRowTitle : this.options.texts.updateRowTitle;
			var $form = this.getEditingForm(rowData);
			var $modal = this.getEditingModal();
			$modal.find('.modal-header .editing-title').html(title);
			$modal.find('.modal-body').empty().append($form);
			$modal.modal('show');

			var that = this;
			$modal.find('.editing-submit').off('click').on('click', function(e) {
				that.doSaveRow(rowId, $form);
				$modal.modal('hide');
			});
		}
		
		, getEditingModal: function() {
			var $placeholder = this.$element.parent() || $(document.body);
			var modals = $placeholder.find('.editing-modal');
			if (modals && modals.length > 0) {
				return $(modals[0]);
			}
			
			var modal = this.options.editingModalTemplate;
			var $modal = $(modal);
			$modal.find('.editing-submit').html(this.options.texts.submitButton);
			$modal.find('.editing-cancel').html(this.options.texts.cancelButton);
			$modal.appendTo($placeholder);
			$modal.on('hidden', function() {
				$(this).find('.modal-body').empty();
			});
			return $modal;
		}
		
		, getEditingForm: function(rowData) {
			var form = '<form class="form-horizontal">';
			var hiddenElems = '';
			for (var i = 0, len = this.colModels.length; i < len; i++) {
				var colModel = this.colModels[i];
				var colVal = this.getColValue(rowData, colModel) || '';
				if (colModel.hidden) {
					hiddenElems += this.getHiddenElement(colModel, colVal);
					continue;
				}
				
				var elem;
				if (colModel.editable) {
					elem = this.getEditor(colVal, colModel, true);
				} else {
					elem = this.addLabel(this.getTextElement(colModel, colVal, true), colModel);
				}
				form += elem;
			}
			hiddenElems != '' && (form += hiddenElems);
			form += '</form>';
			return $(form);
		}
		
		, getEditor: function(colValue, colModel, withLabel) {
			var editor;
			if (colModel.editor) {
				if (typeof colModel.editor === 'function') {
					editor = colModel.editor(colValue, colModel);
				} else {
					editor = this.getElementByType(colModel.editor, colValue, colModel);
				}
			} else {
				editor = this.getTextElement(colModel, colValue);
			}
			return withLabel ? this.addLabel(editor, colModel) : editor;
		}
		
		, getElementByType: function(type, colValue, colModel) {
			var elem;
			switch (type) {
				case 'checkbox':
					elem = this.getCheckboxElement(colModel, colValue);
					break;
				case 'radio':
					elem = this.getRadioElement(colModel, colValue);
					break;
				case 'select':
					elem = this.getSelectElement(colModel, colValue);
					break;
				case 'multiselect':
					elem = this.getMultiSelectElement(colModel, colValue);
					break;
				case 'textarea':
					elem = this.getTextAreaElement(colModel, colValue);
					break;
				case 'password':
					elem = this.getPasswordElement(colModel, colValue);
					break;
				case 'text':
					elem = this.getTextElement(colModel, colValue);
					break;
				case 'hidden':
					elem = this.getHiddenElement(colModel, colValue);
					withLabel = false;
					break;
				default:
					elem = this.getTextElement(colModel, colValue);
			}
			return elem;
		}
		
		, getCheckboxElement: function(colModel, checkVal) {
			var elem = '', options = this.getColOptions(colModel);
			checkVal && (checkVal = checkVal.toString());
			for(var value in options) {
				var label = options[value];
				var cb = '<input type="checkbox" name="' + colModel.name + '" value="' + value + (value == checkVal ? '" checked="checked">' : '">') + label;
				elem += '<label class="checkbox inline">' + cb + '</label>';
			}
			return elem;
		}
		
		, getRadioElement: function(colModel, checkVal) {
			var elem = '', options = this.getColOptions(colModel);
			checkVal && (checkVal = checkVal.toString());
			for(var value in options) {
				var label = options[value];
				var rd = '<input type="radio" name="' + colModel.name + '" value="' + value + (value == checkVal ? '" checked="checked">' : '">') + label;
				elem += '<label class="radio inline">' + rd + '</label>';
			}
			return elem;
		}
		
		, getSelectElement: function(colModel, selectVal) {
			var elem = '<select name="' + colModel.name + '">', options = this.getColOptions(colModel);
			for(var value in options) {
				var label = options[value];
				elem += '<option value="' + value + (value == selectVal ? '" selected="selected">' : '">') + label + '</option>';
			}
			elem += '</select>';
			return elem;
		}
		
		, getMultiSelectElement: function(colModel, selectVals) {
			var elem = '<select name="' + colModel.name + '" multiple="multiple">', options = this.getColOptions(colModel);
			var isObj = selectVals.length > 0 && selectVals[0] instanceof Object ? true : false;
			var subName = colModel['subName'] || 'id';
			for(var value in options) {
				var label = options[value];
				var isSel = false;
				for (var i = 0, len = selectVals.length; i < len; i++) {
					var selVal = isObj ? selectVals[i][subName] : selectVals[i];
					if (value == selVal) {
						isSel = true;
						break;
					}
				}
				elem += '<option value="' + value + (isSel ? '" selected="selected">' : '">') + label + '</option>';
			}
			elem += '</select>';
			return elem;
		}
		
		, getHiddenElement: function(colModel, colValue) {
			return '<input type="hidden" name="' + colModel.name + '" value="' + colValue + '">';
		}
		
		, getTextAreaElement: function(colModel, colValue) {
			return '<textarea class="input-block-level" name="' + colModel.name + '" rows="3">' + colValue + '</textarea>';
		}
		
		, getPasswordElement: function(colModel, colValue) {
			return '<input class="input-block-level" type="password" name="' + colModel.name + '" value="' + colValue + '">';
		}
		
		, getTextElement: function(colModel, colValue, disabled) {
			return '<input class="input-block-level" type="text" name="' + colModel.name + '" value="' + colValue + '"' + (disabled ? '" disabled">' : '>');
		}
		
		, addLabel: function(elem, colModel) {
			var elems = '<div class="control-group">'
				+ '<label class="control-label" for="' + colModel.name + '">' + colModel.header + '</label>'
				+ '<div class="controls">' + elem + '</div></div>';
			return elems;
		}
		
		, isFocusout: function(e) {
			var offset = this.$element.offset();
			var width = this.$element.width();
			var height = this.$element.height();
			var xmin = offset.left, ymin = offset.top, xmax = xmin + width, ymax = ymin + height;
			return (e.pageX < xmin) || (e.pageX > xmax) || (e.pageY < ymin) || (e.pageY > ymax) ? true : false;
		}
	};

	$.fn.mytable = function(option, value) {
		var methodReturn = undefined;
		var $compSet = this.each(function() {
			var $this = $(this), data = $this.data(compName), options = typeof option === 'object' && option;
			if (!data) $this.data(compName, (data = new MyTable(this, options)));
			if (typeof option === 'string') methodReturn = data[option](value);
		});
		return methodReturn === undefined ? $compSet : methodReturn;
	};

	$.fn.mytable.defaults = {
		classes: {hover: 'info', highlight: 'success', activePagingBtn:'btn-primary'},
		pageSizeOptions: [10, 20, 50],
		pagerLocation: 'bottom',
		paramNames: {page:'page', pageSize:'pageSize', records:'records', totalRecords:'totalRecords', sort:'sort', sortDir:'sortDir'},
		sortDir: {asc:'asc', desc:'desc'},
		texts: {addRowTitle:'Add Record'
			, updateRowTitle:'Update Record'
			, deleteRowTitle:'Delete Record'
			, deleteRowSubject:'<span class="text-warning"><h4>Are you sure to delete the following record(s)?</h4></span>'
			, submitButton:'Submit'
			, cancelButton:'Cancel'},
		pageRangeTemplate: '<span>View {{fromRecord}} - {{toRecord}} of {{totalRecords}} {{pageSize}} per page</span>',
		pagingTemplate: '<span class="pull-right">{{firstButton}}{{prevButton}} Page {{currentPage}} of {{totalPages}} {{nextButton}}{{lastButton}}</span>',
		editingModalTemplate: '<div class="editing-modal modal hide fade">'
			+ '<div class="modal-header">'
			+ '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'
			+ '<h3 class="editing-title"></h3></div>'
			+ '<div class="modal-body"></div>'
			+ '<div class="modal-footer">'
			+ '<div class="pull-right">'
			+ '<button type="button" class="btn btn-primary editing-submit"></button>'
			+ '<button type="button" class="btn editing-cancel" data-dismiss="modal" aria-hidden="true"></button>'
			+ '</div></div></div>',
		gotoPageTemplate: '<input type="text" class="input-mini paging-value">'
			+ ' <button type="button" class="btn btn-primary btn-small paging-confirm"><i class="icon-ok icon-white"></i></button>'
			+ ' <button type="button" class="btn btn-small paging-cancel"><i class="icon-remove"></i></button>',
		loadingBarTemplate: '<div class="loading-bar dropdown"><div class="dropdown-menu"><div class="progress progress-striped active"><div class="bar" style="width:100%"></div></div></div></div>'
	};

	$.fn.mytable.Constructor = MyTable;
	
}(window.jQuery);
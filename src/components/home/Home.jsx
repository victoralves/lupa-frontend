import React from 'react'
import PropTypes from 'prop-types'

import './Home.scss'
import Contents from '../contents/Contents'
import Map from '../map/Map'
import Filter from '../filter/Filter'
import FullScreenLoading from '../utils/FullScreenLoading'
import Api from '../api/Api'

const propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      entityType: PropTypes.string,
      entityId: PropTypes.string,
    }),
  }).isRequired,
}

class Home extends React.Component {
  constructor(props) {
    super(props)
    this.state = { loading: true, activeFilter: 'CONVERGENCIA' }
    this.checkContent = this.checkContent.bind(this)
    this.renderBox = this.renderBox.bind(this)
  }

  componentDidMount() {
    const { loading } = this.state
    const { match } = this.props
    if (loading) {
      this.loadEntityData(match.params.entityType, match.params.entityId)
    }
  }

  /**
   * Checks if there was a change in the navigation params
   * and updates the component with new data
   */
  componentDidUpdate(prevProps) {
    const prevType = prevProps.match.params.entityType
    const prevId = prevProps.match.params.entityId
    const { match } = this.props
    const currentType = match.params.entityType
    const currentId = match.params.entityId
    if (currentId !== prevId || currentType !== prevType) {
      this.loadEntityData(currentType, currentId)
    }
  }

  /**
   * Controls the loading and loads new entity data
   * @param  {string} entityType
   * @param  {string} entityId
   * @return {void}
   */
  loadEntityData(entityType, entityId) {
    const { loading } = this.state
    if (!loading) {
      this.setState({ loading: true })
    }
    Api.getEntityData(this.checkContent, entityType, entityId)
  }

  /**
   * Callback from the getEntityData function
   * Handles database response, updating the state with the error
   * or new data and loading the entity's boxes if they exist
   * @param {Object} entityResponse whatever comer from the database
   * @param {Object} entityResponse.data_list[] Objects to load data and display in boxes
   * @param {Number} entityResponse.data_list[].id Data ID to load
   * @param {String} entityResponse.domain_id UUID of entity
   * @param {String} entityResponse.entity_type Entity type
   * @param {String} entityResponse.exibition_field Name to use as exibition
   * @param {Object} entityResponse.geojson GeoJSON of entity to be displayed on the map
   */
  checkContent(entityResponse) {
    if (!entityResponse.theme_list) {
      this.setState({
        loading: false,
        error: entityResponse,
        content: null,
        name: null,
        title: 'Erro',
      })
      return
    }

    // if the array isn't a theme, the boxes should be displayed in the home component
    // else the boxes should be handled by their own theme's components
    const homeBoxes = []
    const homeThemes = []

    entityResponse.theme_list.forEach((theme) => {
      if (!theme.tema) {
        const loadingBoxes = theme.data_list.map(info => ({
          id: info.id,
          data_type: 'loading',
        }))
        homeBoxes.push(...loadingBoxes)
      } else {
        const themeObj = { name: theme.tema, color: theme.cor, content: theme.data_list }
        homeThemes.push(themeObj)
      }
    })

    this.setState({
      loading: false,
      error: null,
      content: homeBoxes,
      themes: homeThemes,
      geojson: entityResponse.geojson,
      name: entityResponse.exibition_field,
      title: entityResponse.entity_type,
    })

    this.loadBoxes(homeBoxes)
  }

  /**
   * Creates promises to get the boxes' content from the database
   * @param  {array} dataList Array of jsons with the boxes id's
   * @return {void}
   */
  loadBoxes(dataList) {
    const { match } = this.props
    const { entityType, entityId } = match.params
    dataList.forEach(item => Api.getBoxData(this.renderBox, entityType, entityId, item.id))
  }

  /**
   * NOT FOR VERSION ONE
   * Changes the current filter applied to the content
   * @param  {string} filter filter name
   * @return {void}
   */
  handleFiltering(filter) {
    // this.setState({ activeFilter: filter })
    this.handleNavigateToEntity('EST', '33')
  }

  handleNavigateToEntity(entityType, entityId) {
    const { history } = this.props
    history.push(`/${entityType}/${entityId}`)
  }

  /**
   * Callback from the getBoxData function
   * Receives the box info after the promise is resolved
   * and updates the state with the new data
   * @param  {json} updatedBox actual box content
   * @param  {string} boxId    id (only comes if the request fails)
   * @return {void}
   */
  renderBox(updatedBox, boxId) {
    const { content } = this.state
    let newContent
    if (boxId) {
      newContent = content.filter(box => box.id !== boxId)
    } else {
      newContent = content.map((box) => {
        if (box.id === updatedBox.id) return updatedBox

        return box
      })
    }
    // const newBox = boxId ? null : updatedBox

    this.setState({ content: newContent })
  }

  render() {
    const {
      loading, activeFilter, content, error, geojson, name, title,
    } = this.state

    if (loading) return <FullScreenLoading />

    return (
      <div className="Entity-container">
        <div className="Main-container">
          {geojson ? (
            <Map
              geojsonArray={geojson}
              navigateToEntity={(entityType, entityId) => this.handleNavigateToEntity(entityType, entityId)
              }
            />
          ) : null}
          <div className="Name-container">{title.toLocaleUpperCase()}</div>
          <div className="Name-helper" />
          <div className="Entity-title-container">{name}</div>
          <Contents
            error={error}
            boxes={content}
            navigateToEntity={(entityType, entityId) => this.handleNavigateToEntity(entityType, entityId)
            }
          />
        </div>
        <Filter active={activeFilter} filterClicked={filter => this.handleFiltering(filter)} />
      </div>
    )
  }
}

Home.propTypes = propTypes
export default Home
